import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
export declare class ComponentsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getByQr(qrCode: string): Promise<{
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
    getByPost(postId: string): Promise<({
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
    getQrImage(id: string, res: Response): Promise<void>;
}
