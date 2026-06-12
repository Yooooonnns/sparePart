"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
const XLSX = require("xlsx");
const PC_INCLUDE = {
    component: true,
    post: { include: { line: { include: { project: true } } } },
};
let AdminController = class AdminController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(postId, lineId, projectId) {
        return this.prisma.postComponent.findMany({
            where: {
                isActive: true,
                ...(postId ? { postId } : {}),
                ...(lineId ? { post: { lineId } } : {}),
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
    async add(body) {
        const { postId, reference, category } = body;
        if (!postId || !reference?.trim() || !category?.trim())
            throw new common_1.BadRequestException('postId, reference and category are required');
        const post = await this.prisma.post.findUnique({ where: { id: postId } });
        if (!post)
            throw new common_1.NotFoundException('Post not found');
        const component = await this.prisma.component.upsert({
            where: { reference: reference.trim() },
            create: { reference: reference.trim(), category: category.trim() },
            update: { category: category.trim() },
        });
        const existing = await this.prisma.postComponent.findUnique({
            where: { postId_componentId: { postId, componentId: component.id } },
        });
        if (existing) {
            if (existing.isActive)
                throw new common_1.BadRequestException('Component already linked to this post');
            return this.prisma.postComponent.update({
                where: { id: existing.id },
                data: { isActive: true },
                include: PC_INCLUDE,
            });
        }
        return this.prisma.postComponent.create({
            data: { postId, componentId: component.id, qrCode: (0, crypto_1.randomUUID)() },
            include: PC_INCLUDE,
        });
    }
    async remove(id) {
        const pc = await this.prisma.postComponent.findUnique({ where: { id } });
        if (!pc)
            throw new common_1.NotFoundException('PostComponent not found');
        return this.prisma.postComponent.update({
            where: { id },
            data: { isActive: false },
            include: PC_INCLUDE,
        });
    }
    async regenerateQr(id) {
        const pc = await this.prisma.postComponent.findUnique({ where: { id } });
        if (!pc)
            throw new common_1.NotFoundException('PostComponent not found');
        return this.prisma.postComponent.update({
            where: { id },
            data: { qrCode: (0, crypto_1.randomUUID)() },
            include: PC_INCLUDE,
        });
    }
    async importExcel(file) {
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        const wb = XLSX.read(file.buffer, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!rows.length)
            throw new common_1.BadRequestException('Sheet is empty');
        const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '');
        const first = rows[0];
        const hMap = {};
        Object.keys(first).forEach((h) => { hMap[norm(h)] = h; });
        const get = (row, ...aliases) => {
            for (const a of aliases) {
                const v = row[hMap[norm(a)]];
                if (v !== undefined && v !== '')
                    return String(v).trim();
            }
            return '';
        };
        const projectCache = new Map();
        const lineCache = new Map();
        const postCache = new Map();
        const componentCache = new Map();
        const stats = { created: 0, reactivated: 0, skipped: 0, errors: [] };
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            const projectName = get(row, 'project', 'projet');
            const lineName = get(row, 'line', 'ligne');
            const postNum = get(row, 'post', 'poste', 'postnumber', 'postnuméro');
            const reference = get(row, 'reference', 'ref', 'component', 'composant');
            const category = get(row, 'category', 'categorie', 'catégorie', 'type');
            if (!projectName || !lineName || !postNum || !reference || !category) {
                stats.errors.push(`Row ${rowNum}: missing required fields`);
                stats.skipped++;
                continue;
            }
            try {
                if (!projectCache.has(projectName)) {
                    const p = await this.prisma.project.upsert({
                        where: { name: projectName },
                        create: { name: projectName },
                        update: {},
                    });
                    projectCache.set(projectName, p.id);
                }
                const projectId = projectCache.get(projectName);
                const lineKey = `${projectId}::${lineName}`;
                if (!lineCache.has(lineKey)) {
                    const l = await this.prisma.line.upsert({
                        where: { name_projectId: { name: lineName, projectId } },
                        create: { name: lineName, projectId },
                        update: {},
                    });
                    lineCache.set(lineKey, l.id);
                }
                const lineId = lineCache.get(lineKey);
                const postKey = `${lineId}::${postNum}`;
                if (!postCache.has(postKey)) {
                    const po = await this.prisma.post.upsert({
                        where: { number_lineId: { number: postNum, lineId } },
                        create: { number: postNum, lineId },
                        update: {},
                    });
                    postCache.set(postKey, po.id);
                }
                const postId = postCache.get(postKey);
                if (!componentCache.has(reference)) {
                    const c = await this.prisma.component.upsert({
                        where: { reference },
                        create: { reference, category },
                        update: { category },
                    });
                    componentCache.set(reference, c.id);
                }
                const componentId = componentCache.get(reference);
                const existing = await this.prisma.postComponent.findUnique({
                    where: { postId_componentId: { postId, componentId } },
                });
                if (existing) {
                    if (!existing.isActive) {
                        await this.prisma.postComponent.update({ where: { id: existing.id }, data: { isActive: true } });
                        stats.reactivated++;
                    }
                    else {
                        stats.skipped++;
                    }
                }
                else {
                    await this.prisma.postComponent.create({ data: { postId, componentId, qrCode: (0, crypto_1.randomUUID)() } });
                    stats.created++;
                }
            }
            catch (e) {
                stats.errors.push(`Row ${rowNum}: ${e.message}`);
                stats.skipped++;
            }
        }
        return stats;
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('post-components'),
    __param(0, (0, common_1.Query)('postId')),
    __param(1, (0, common_1.Query)('lineId')),
    __param(2, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('post-components'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "add", null);
__decorate([
    (0, common_1.Delete)('post-components/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('post-components/:id/regenerate-qr'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "regenerateQr", null);
__decorate([
    (0, common_1.Post)('import'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "importExcel", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map