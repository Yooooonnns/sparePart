import { PrismaService } from '../prisma/prisma.service';
export declare class ProjectsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(): import(".prisma/client").Prisma.PrismaPromise<({
        lines: ({
            posts: {
                number: string;
                id: string;
                lineId: string;
            }[];
        } & {
            id: string;
            name: string;
            projectId: string;
        })[];
    } & {
        id: string;
        name: string;
    })[]>;
}
