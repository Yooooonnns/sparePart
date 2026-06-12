import { PrismaService } from '../prisma/prisma.service';
import { RequestsGateway } from '../gateway/requests.gateway';
import { RequestStatus } from '@prisma/client';
export declare class RequestsController {
    private readonly prisma;
    private readonly gateway;
    constructor(prisma: PrismaService, gateway: RequestsGateway);
    list(status?: RequestStatus, postId?: string, lineId?: string, projectId?: string, from?: string, to?: string): import(".prisma/client").Prisma.PrismaPromise<({
        post: {
            line: {
                project: {
                    id: string;
                    name: string;
                };
            } & {
                projectId: string;
                id: string;
                name: string;
            };
        } & {
            number: string;
            lineId: string;
            id: string;
        };
        component: {
            id: string;
            reference: string;
            category: string;
        };
    } & {
        id: string;
        postId: string;
        componentId: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        notes: string | null;
        requestedAt: Date;
        issuedAt: Date | null;
        issuedBy: string | null;
        cancelledAt: Date | null;
    })[]>;
    consumption(from?: string, to?: string, postId?: string, lineId?: string, projectId?: string): import(".prisma/client").Prisma.PrismaPromise<({
        post: {
            line: {
                project: {
                    id: string;
                    name: string;
                };
            } & {
                projectId: string;
                id: string;
                name: string;
            };
        } & {
            number: string;
            lineId: string;
            id: string;
        };
        component: {
            id: string;
            reference: string;
            category: string;
        };
    } & {
        id: string;
        postId: string;
        componentId: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        notes: string | null;
        requestedAt: Date;
        issuedAt: Date | null;
        issuedBy: string | null;
        cancelledAt: Date | null;
    })[]>;
    create(body: {
        componentId: string;
        postId: string;
        notes?: string;
    }): Promise<{
        post: {
            line: {
                project: {
                    id: string;
                    name: string;
                };
            } & {
                projectId: string;
                id: string;
                name: string;
            };
        } & {
            number: string;
            lineId: string;
            id: string;
        };
        component: {
            id: string;
            reference: string;
            category: string;
        };
    } & {
        id: string;
        postId: string;
        componentId: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        notes: string | null;
        requestedAt: Date;
        issuedAt: Date | null;
        issuedBy: string | null;
        cancelledAt: Date | null;
    }>;
    updateStatus(id: string, body: {
        status: RequestStatus;
        issuedBy?: string;
        notes?: string;
    }): Promise<{
        post: {
            line: {
                project: {
                    id: string;
                    name: string;
                };
            } & {
                projectId: string;
                id: string;
                name: string;
            };
        } & {
            number: string;
            lineId: string;
            id: string;
        };
        component: {
            id: string;
            reference: string;
            category: string;
        };
    } & {
        id: string;
        postId: string;
        componentId: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        notes: string | null;
        requestedAt: Date;
        issuedAt: Date | null;
        issuedBy: string | null;
        cancelledAt: Date | null;
    }>;
}
