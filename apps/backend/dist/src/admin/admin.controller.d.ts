import { PrismaService } from '../prisma/prisma.service';
export declare class AdminController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(postId?: string, lineId?: string, projectId?: string): import(".prisma/client").Prisma.PrismaPromise<({
        post: {
            line: {
                project: {
                    id: string;
                    name: string;
                };
            } & {
                id: string;
                name: string;
                projectId: string;
            };
        } & {
            number: string;
            id: string;
            lineId: string;
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
        qrCode: string;
        isActive: boolean;
    })[]>;
    add(body: {
        postId: string;
        reference: string;
        category: string;
    }): Promise<{
        post: {
            line: {
                project: {
                    id: string;
                    name: string;
                };
            } & {
                id: string;
                name: string;
                projectId: string;
            };
        } & {
            number: string;
            id: string;
            lineId: string;
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
        qrCode: string;
        isActive: boolean;
    }>;
    remove(id: string): Promise<{
        post: {
            line: {
                project: {
                    id: string;
                    name: string;
                };
            } & {
                id: string;
                name: string;
                projectId: string;
            };
        } & {
            number: string;
            id: string;
            lineId: string;
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
        qrCode: string;
        isActive: boolean;
    }>;
    regenerateQr(id: string): Promise<{
        post: {
            line: {
                project: {
                    id: string;
                    name: string;
                };
            } & {
                id: string;
                name: string;
                projectId: string;
            };
        } & {
            number: string;
            id: string;
            lineId: string;
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
        qrCode: string;
        isActive: boolean;
    }>;
    importExcel(file: Express.Multer.File): Promise<{
        created: number;
        reactivated: number;
        skipped: number;
        errors: string[];
    }>;
}
