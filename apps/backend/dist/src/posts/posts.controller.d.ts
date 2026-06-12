import { PrismaService } from '../prisma/prisma.service';
export declare class PostsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(lineId?: string, projectId?: string): import(".prisma/client").Prisma.PrismaPromise<({
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
        postComponents: ({
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
        })[];
    } & {
        number: string;
        id: string;
        lineId: string;
    })[]>;
}
