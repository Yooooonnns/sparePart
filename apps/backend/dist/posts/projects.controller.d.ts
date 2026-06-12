import { PrismaService } from '../prisma/prisma.service';
export declare class ProjectsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(): import(".prisma/client").Prisma.PrismaPromise<({
        lines: ({
            posts: {
                number: string;
                lineId: string;
                id: string;
            }[];
        } & {
            projectId: string;
            id: string;
            name: string;
        })[];
    } & {
        id: string;
        name: string;
    })[]>;
}
