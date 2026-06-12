import {
  Controller, Get, Post, Delete, Body, Param, Query,
  NotFoundException, BadRequestException,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';

const PC_INCLUDE = {
  component: true,
  post: { include: { line: { include: { project: true } } } },
} as const;

@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  // ── List all post-components ──────────────────────────────────────────────

  @Get('post-components')
  list(
    @Query('postId') postId?: string,
    @Query('lineId') lineId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.prisma.postComponent.findMany({
      where: {
        isActive: true,
        ...(postId    ? { postId }                        : {}),
        ...(lineId    ? { post: { lineId } }              : {}),
        ...(projectId ? { post: { line: { projectId } } } : {}),
      },
      include: PC_INCLUDE,
      orderBy: [
        { post: { line: { project: { name: 'asc' } } } },
        { post: { line: { name: 'asc' } } },
        { post: { number: 'asc' } },
        { component: { reference: 'asc' } },
      ],
    });
  }

  // ── Add a single component to a post ─────────────────────────────────────

  @Post('post-components')
  async add(@Body() body: { postId: string; reference: string; category: string }) {
    const { postId, reference, category } = body;
    if (!postId || !reference?.trim() || !category?.trim())
      throw new BadRequestException('postId, reference and category are required');

    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const component = await this.prisma.component.upsert({
      where: { reference: reference.trim() },
      create: { reference: reference.trim(), category: category.trim() },
      update: { category: category.trim() },
    });

    const existing = await this.prisma.postComponent.findUnique({
      where: { postId_componentId: { postId, componentId: component.id } },
    });

    if (existing) {
      if (existing.isActive) throw new BadRequestException('Component already linked to this post');
      return this.prisma.postComponent.update({
        where: { id: existing.id },
        data: { isActive: true },
        include: PC_INCLUDE,
      });
    }

    return this.prisma.postComponent.create({
      data: { postId, componentId: component.id, qrCode: randomUUID() },
      include: PC_INCLUDE,
    });
  }

  // ── Remove (soft-delete) a component from a post ─────────────────────────

  @Delete('post-components/:id')
  async remove(@Param('id') id: string) {
    const pc = await this.prisma.postComponent.findUnique({ where: { id } });
    if (!pc) throw new NotFoundException('PostComponent not found');
    return this.prisma.postComponent.update({
      where: { id },
      data: { isActive: false },
      include: PC_INCLUDE,
    });
  }

  // ── Regenerate QR for a post-component ───────────────────────────────────

  @Post('post-components/:id/regenerate-qr')
  async regenerateQr(@Param('id') id: string) {
    const pc = await this.prisma.postComponent.findUnique({ where: { id } });
    if (!pc) throw new NotFoundException('PostComponent not found');
    return this.prisma.postComponent.update({
      where: { id },
      data: { qrCode: randomUUID() },
      include: PC_INCLUDE,
    });
  }

  // ── Excel import ──────────────────────────────────────────────────────────
  // Required columns (case-insensitive): Project | Line | Post | Category | Reference
  // One row = one component at one post.

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const wb   = XLSX.read(file.buffer, { type: 'buffer' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    if (!rows.length) throw new BadRequestException('Sheet is empty');

    // Map any header to a canonical key
    const norm  = (s: string) => String(s).toLowerCase().replace(/[^a-z]/g, '');
    const first = rows[0];
    const hMap: Record<string, string> = {};
    Object.keys(first).forEach((h) => { hMap[norm(h)] = h; });

    const get = (row: Record<string, unknown>, ...aliases: string[]) => {
      for (const a of aliases) {
        const v = row[hMap[norm(a)]];
        if (v !== undefined && v !== '') return String(v).trim();
      }
      return '';
    };

    const projectCache   = new Map<string, string>();
    const lineCache      = new Map<string, string>();
    const postCache      = new Map<string, string>();
    const componentCache = new Map<string, string>();
    const stats = { created: 0, reactivated: 0, skipped: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i++) {
      const row    = rows[i];
      const rowNum = i + 2;

      const projectName = get(row, 'project', 'projet');
      const lineName    = get(row, 'line', 'ligne');
      const postNum     = get(row, 'post', 'poste', 'postnumber', 'postnuméro');
      const reference   = get(row, 'reference', 'ref', 'component', 'composant');
      const category    = get(row, 'category', 'categorie', 'catégorie', 'type');

      if (!projectName || !lineName || !postNum || !reference || !category) {
        stats.errors.push(`Row ${rowNum}: missing required fields`);
        stats.skipped++;
        continue;
      }

      try {
        // Project
        if (!projectCache.has(projectName)) {
          const p = await this.prisma.project.upsert({
            where: { name: projectName },
            create: { name: projectName },
            update: {},
          });
          projectCache.set(projectName, p.id);
        }
        const projectId = projectCache.get(projectName)!;

        // Line
        const lineKey = `${projectId}::${lineName}`;
        if (!lineCache.has(lineKey)) {
          const l = await this.prisma.line.upsert({
            where: { name_projectId: { name: lineName, projectId } },
            create: { name: lineName, projectId },
            update: {},
          });
          lineCache.set(lineKey, l.id);
        }
        const lineId = lineCache.get(lineKey)!;

        // Post
        const postKey = `${lineId}::${postNum}`;
        if (!postCache.has(postKey)) {
          const po = await this.prisma.post.upsert({
            where: { number_lineId: { number: postNum, lineId } },
            create: { number: postNum, lineId },
            update: {},
          });
          postCache.set(postKey, po.id);
        }
        const postId = postCache.get(postKey)!;

        // Component catalog
        if (!componentCache.has(reference)) {
          const c = await this.prisma.component.upsert({
            where: { reference },
            create: { reference, category },
            update: { category },
          });
          componentCache.set(reference, c.id);
        }
        const componentId = componentCache.get(reference)!;

        // PostComponent junction
        const existing = await this.prisma.postComponent.findUnique({
          where: { postId_componentId: { postId, componentId } },
        });

        if (existing) {
          if (!existing.isActive) {
            await this.prisma.postComponent.update({ where: { id: existing.id }, data: { isActive: true } });
            stats.reactivated++;
          } else {
            stats.skipped++;
          }
        } else {
          await this.prisma.postComponent.create({ data: { postId, componentId, qrCode: randomUUID() } });
          stats.created++;
        }
      } catch (e) {
        stats.errors.push(`Row ${rowNum}: ${(e as Error).message}`);
        stats.skipped++;
      }
    }

    return stats;
  }
}
