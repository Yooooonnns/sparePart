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
exports.ComponentsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const QRCode = require("qrcode");
const POST_COMPONENT_INCLUDE = {
    component: true,
    post: {
        include: { line: { include: { project: true } } },
    },
};
let ComponentsController = class ComponentsController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getByQr(qrCode) {
        const pc = await this.prisma.postComponent.findUnique({
            where: { qrCode },
            include: POST_COMPONENT_INCLUDE,
        });
        if (!pc)
            throw new common_1.NotFoundException('QR code not found');
        if (!pc.isActive)
            throw new common_1.NotFoundException('This component is inactive at this post');
        return pc;
    }
    async getByPost(postId) {
        return this.prisma.postComponent.findMany({
            where: { postId, isActive: true },
            include: { component: true },
            orderBy: { component: { reference: 'asc' } },
        });
    }
    async getQrImage(id, res) {
        const pc = await this.prisma.postComponent.findUnique({ where: { id } });
        if (!pc)
            throw new common_1.NotFoundException('PostComponent not found');
        const buffer = await QRCode.toBuffer(`/scan/${pc.qrCode}`, { width: 300, margin: 2 });
        res.setHeader('Content-Type', 'image/png');
        res.send(buffer);
    }
};
exports.ComponentsController = ComponentsController;
__decorate([
    (0, common_1.Get)('scan/:qrCode'),
    __param(0, (0, common_1.Param)('qrCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ComponentsController.prototype, "getByQr", null);
__decorate([
    (0, common_1.Get)('by-post/:postId'),
    __param(0, (0, common_1.Param)('postId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ComponentsController.prototype, "getByPost", null);
__decorate([
    (0, common_1.Get)(':id/qr-image'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ComponentsController.prototype, "getQrImage", null);
exports.ComponentsController = ComponentsController = __decorate([
    (0, common_1.Controller)('components'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ComponentsController);
//# sourceMappingURL=components.controller.js.map