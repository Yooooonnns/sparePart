import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query('lineId') lineId?: string, @Query('projectId') projectId?: string) {
    return this.prisma.post.findMany({
      where: {
        ...(lineId    ? { lineId }                  : {}),
        ...(projectId ? { line: { projectId } }     : {}),
      },
      include: {
        line: { include: { project: true } },
        postComponents: {
          where: { isActive: true },
          include: { component: true },
          orderBy: { component: { reference: 'asc' } },
        },
      },
      orderBy: [{ line: { name: 'asc' } }, { number: 'asc' }],
    });
  }
}
