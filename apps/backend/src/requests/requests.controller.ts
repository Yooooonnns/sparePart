import {
  Controller, Get, Post, Patch, Body, Param, Query,
  NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsGateway } from '../gateway/requests.gateway';
import { RequestStatus } from '@prisma/client';

const REQUEST_INCLUDE = {
  component: true,
  post: {
    include: { line: { include: { project: true } } },
  },
} as const;

@Controller('requests')
export class RequestsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RequestsGateway,
  ) {}

  @Get()
  list(
    @Query('status') status?: RequestStatus,
    @Query('postId') postId?: string,
    @Query('lineId') lineId?: string,
    @Query('projectId') projectId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.prisma.componentRequest.findMany({
      where: {
        ...(status    ? { status }                          : {}),
        ...(postId    ? { postId }                          : {}),
        ...(lineId    ? { post: { lineId } }                : {}),
        ...(projectId ? { post: { line: { projectId } } }   : {}),
        ...((from || to) ? {
          requestedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to   ? { lte: new Date(to)   } : {}),
          },
        } : {}),
      },
      include: REQUEST_INCLUDE,
      orderBy: { requestedAt: 'desc' },
    });
  }

  @Get('consumption')
  consumption(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('postId') postId?: string,
    @Query('lineId') lineId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.prisma.componentRequest.findMany({
      where: {
        status: 'ISSUED',
        ...(postId    ? { postId }                          : {}),
        ...(lineId    ? { post: { lineId } }                : {}),
        ...(projectId ? { post: { line: { projectId } } }   : {}),
        ...((from || to) ? {
          issuedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to   ? { lte: new Date(to)   } : {}),
          },
        } : {}),
      },
      include: REQUEST_INCLUDE,
      orderBy: { issuedAt: 'desc' },
    });
  }

  @Post()
  async create(@Body() body: { componentId: string; postId: string; notes?: string }) {
    if (!body.componentId) throw new BadRequestException('componentId is required');
    if (!body.postId)      throw new BadRequestException('postId is required');

    const pc = await this.prisma.postComponent.findUnique({
      where: { postId_componentId: { postId: body.postId, componentId: body.componentId } },
    });
    if (!pc)          throw new NotFoundException('Component not found at this post');
    if (!pc.isActive) throw new BadRequestException('Component is inactive at this post');

    const request = await this.prisma.componentRequest.create({
      data: {
        componentId: body.componentId,
        postId:      body.postId,
        notes:       body.notes?.trim() || null,
      },
      include: REQUEST_INCLUDE,
    });

    this.gateway.emitRequestNew(request as any);
    return request;
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: RequestStatus; issuedBy?: string; notes?: string },
  ) {
    const req = await this.prisma.componentRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Request not found');

    const allowed: Record<RequestStatus, RequestStatus[]> = {
      PENDING:   ['ISSUED', 'CANCELLED'],
      ISSUED:    [],
      CANCELLED: [],
    };
    if (!allowed[req.status].includes(body.status)) {
      throw new BadRequestException(`Cannot transition from ${req.status} to ${body.status}`);
    }

    const updated = await this.prisma.componentRequest.update({
      where: { id },
      data: {
        status: body.status,
        ...(body.status === 'ISSUED'    ? { issuedAt: new Date(), issuedBy: body.issuedBy ?? null } : {}),
        ...(body.status === 'CANCELLED' ? { cancelledAt: new Date() }                               : {}),
        ...(body.notes                  ? { notes: body.notes }                                     : {}),
      },
      include: REQUEST_INCLUDE,
    });

    this.gateway.emitRequestUpdated(updated as any);
    return updated;
  }
}
