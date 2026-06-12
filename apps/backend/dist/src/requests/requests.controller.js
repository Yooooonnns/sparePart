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
exports.RequestsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const requests_gateway_1 = require("../gateway/requests.gateway");
const client_1 = require("@prisma/client");
const REQUEST_INCLUDE = {
    component: true,
    post: {
        include: { line: { include: { project: true } } },
    },
};
let RequestsController = class RequestsController {
    constructor(prisma, gateway) {
        this.prisma = prisma;
        this.gateway = gateway;
    }
    list(status, postId, lineId, projectId, from, to) {
        return this.prisma.componentRequest.findMany({
            where: {
                ...(status ? { status } : {}),
                ...(postId ? { postId } : {}),
                ...(lineId ? { post: { lineId } } : {}),
                ...(projectId ? { post: { line: { projectId } } } : {}),
                ...((from || to) ? {
                    requestedAt: {
                        ...(from ? { gte: new Date(from) } : {}),
                        ...(to ? { lte: new Date(to) } : {}),
                    },
                } : {}),
            },
            include: REQUEST_INCLUDE,
            orderBy: { requestedAt: 'desc' },
        });
    }
    consumption(from, to, postId, lineId, projectId) {
        return this.prisma.componentRequest.findMany({
            where: {
                status: 'ISSUED',
                ...(postId ? { postId } : {}),
                ...(lineId ? { post: { lineId } } : {}),
                ...(projectId ? { post: { line: { projectId } } } : {}),
                ...((from || to) ? {
                    issuedAt: {
                        ...(from ? { gte: new Date(from) } : {}),
                        ...(to ? { lte: new Date(to) } : {}),
                    },
                } : {}),
            },
            include: REQUEST_INCLUDE,
            orderBy: { issuedAt: 'desc' },
        });
    }
    async create(body) {
        if (!body.componentId)
            throw new common_1.BadRequestException('componentId is required');
        if (!body.postId)
            throw new common_1.BadRequestException('postId is required');
        const pc = await this.prisma.postComponent.findUnique({
            where: { postId_componentId: { postId: body.postId, componentId: body.componentId } },
        });
        if (!pc)
            throw new common_1.NotFoundException('Component not found at this post');
        if (!pc.isActive)
            throw new common_1.BadRequestException('Component is inactive at this post');
        const request = await this.prisma.componentRequest.create({
            data: {
                componentId: body.componentId,
                postId: body.postId,
                notes: body.notes?.trim() || null,
            },
            include: REQUEST_INCLUDE,
        });
        this.gateway.emitRequestNew(request);
        return request;
    }
    async updateStatus(id, body) {
        const req = await this.prisma.componentRequest.findUnique({ where: { id } });
        if (!req)
            throw new common_1.NotFoundException('Request not found');
        const allowed = {
            PENDING: ['ISSUED', 'CANCELLED'],
            ISSUED: [],
            CANCELLED: [],
        };
        if (!allowed[req.status].includes(body.status)) {
            throw new common_1.BadRequestException(`Cannot transition from ${req.status} to ${body.status}`);
        }
        const updated = await this.prisma.componentRequest.update({
            where: { id },
            data: {
                status: body.status,
                ...(body.status === 'ISSUED' ? { issuedAt: new Date(), issuedBy: body.issuedBy ?? null } : {}),
                ...(body.status === 'CANCELLED' ? { cancelledAt: new Date() } : {}),
                ...(body.notes ? { notes: body.notes } : {}),
            },
            include: REQUEST_INCLUDE,
        });
        this.gateway.emitRequestUpdated(updated);
        return updated;
    }
};
exports.RequestsController = RequestsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('postId')),
    __param(2, (0, common_1.Query)('lineId')),
    __param(3, (0, common_1.Query)('projectId')),
    __param(4, (0, common_1.Query)('from')),
    __param(5, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('consumption'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Query)('postId')),
    __param(3, (0, common_1.Query)('lineId')),
    __param(4, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "consumption", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "updateStatus", null);
exports.RequestsController = RequestsController = __decorate([
    (0, common_1.Controller)('requests'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        requests_gateway_1.RequestsGateway])
], RequestsController);
//# sourceMappingURL=requests.controller.js.map