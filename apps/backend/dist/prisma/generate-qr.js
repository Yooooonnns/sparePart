"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const prisma = new client_1.PrismaClient();
const TARGET_POSTS = ['SPS2', 'SPS3A', 'SPS4'];
const TARGET_LINE = 'HABITACLE 3';
const TARGET_PROJECT = 'DPE';
async function main() {
    const outDir = path.join(__dirname, 'qr-output');
    if (!fs.existsSync(outDir))
        fs.mkdirSync(outDir, { recursive: true });
    const postComponents = await prisma.postComponent.findMany({
        where: {
            isActive: true,
            post: {
                number: { in: TARGET_POSTS },
                line: {
                    name: TARGET_LINE,
                    project: { name: TARGET_PROJECT },
                },
            },
        },
        include: {
            component: true,
            post: { include: { line: { include: { project: true } } } },
        },
        orderBy: [
            { post: { number: 'asc' } },
            { component: { reference: 'asc' } },
        ],
    });
    console.log(`Generating QR codes for ${postComponents.length} post-component(s)...\n`);
    for (const pc of postComponents) {
        const project = pc.post.line.project.name;
        const line = pc.post.line.name;
        const post = pc.post.number;
        const ref = pc.component.reference;
        const safeRef = ref.replace(/\s+/g, '_');
        const fileName = `${project}_${line.replace(/\s+/g, '_')}_${post}_${safeRef}.png`;
        const filePath = path.join(outDir, fileName);
        const buffer = await QRCode.toBuffer(`/scan/${pc.qrCode}`, { width: 400, margin: 3 });
        fs.writeFileSync(filePath, buffer);
        console.log(`  [${post}] ${ref}  →  ${fileName}`);
    }
    console.log(`\nDone. Files saved to: ${outDir}`);
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=generate-qr.js.map