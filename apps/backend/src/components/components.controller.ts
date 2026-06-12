import { Controller, Get, Param, NotFoundException, Res } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
import * as QRCode from 'qrcode';

const POST_COMPONENT_INCLUDE = {
  component: true,
  post: {
    include: { line: { include: { project: true } } },
  },
} as const;

@Controller('components')
export class ComponentsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve a scanned QR code → returns { postComponent, component, post } */
  @Get('scan/:qrCode')
  async getByQr(@Param('qrCode') qrCode: string) {
    const pc = await this.prisma.postComponent.findUnique({
      where: { qrCode },
      include: POST_COMPONENT_INCLUDE,
    });
    if (!pc) throw new NotFoundException('QR code not found');
    if (!pc.isActive) throw new NotFoundException('This component is inactive at this post');
    return pc;
  }

  /** List all components at a given post */
  @Get('by-post/:postId')
  async getByPost(@Param('postId') postId: string) {
    return this.prisma.postComponent.findMany({
      where: { postId, isActive: true },
      include: { component: true },
      orderBy: { component: { reference: 'asc' } },
    });
  }

  /** Get QR PNG for a PostComponent */
  @Get(':id/qr-image')
  async getQrImage(@Param('id') id: string, @Res() res: Response) {
    const pc = await this.prisma.postComponent.findUnique({ where: { id } });
    if (!pc) throw new NotFoundException('PostComponent not found');
    const buffer = await QRCode.toBuffer(`/scan/${pc.qrCode}`, { width: 300, margin: 2 });
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  }
}
