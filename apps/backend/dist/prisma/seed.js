"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma = new client_1.PrismaClient();
const PROJECTS = {
    'Cherry': [
        'Cherry Floor',
    ],
    'DPE': [
        'HABITACLE 1', 'HABITACLE 2', 'HABITACLE 3', 'HABITACLE EP512',
        'MAIN EP512', 'MAIN L1', 'MAIN L2', 'MAIN L3', 'PDB 1',
    ],
    'ECMP': [
        'BMS STIPE 2', 'Cable charge HV STAPE 2', 'Fsc mot eK0', 'High Voltage',
        'Low Voltage L1', 'Low Voltage L2', 'Moteur STEP 2', 'PILOTAGE STIPE 2 L1',
        'PILOTAGE STIPE 2 L2', 'SMALLS eK0', 'ECMP SMALLS L1', 'SMALLS STAPE 2',
        'SMALLS STEP 2 Flux1', 'SMALLS STEP 2 High Voltage',
    ],
    'EDPEO': [
        'BMU Gene2', 'Smalls Flux 3', 'Smalls Flux 4',
    ],
    'EK0': [
        'Tous les equipements_Sep-Int',
    ],
    'EK9': [
        'BMS L1', 'Cable de Charge L1', 'DAISY L1', 'Fsc mot L1', 'SMALLS L1',
    ],
    'K0': [
        'HABITACLE 1 K0', 'HABITACLE 2 K0', 'HABITACLE 3 K0',
        'IP Line 01', 'IP Line 02',
        'MAIN L1 K0', 'MAIN L2 K0', 'MAIN L3 K0',
    ],
    'XJX': [
        'MBLOC L1', 'MBLOC L2', 'MBLOC L3', 'MBLOC L4', 'MBLOC L5',
        'PH2', 'PORTE ARR L1', 'SMALLS Shunt hayon/water', 'Vide poche',
    ],
    'ALL': [
        'Projet L01', 'TRAINING',
        'Traction-pre-assy C-TEC POS 24', 'YAESU Nr_2ED-3219',
    ],
};
const POSTS = [
    {
        project: 'DPE',
        line: 'HABITACLE 3',
        postNumber: 'SPS2',
        components: [
            { reference: 'C230 7287 4314 80', category: '' },
        ],
    },
    {
        project: 'DPE',
        line: 'HABITACLE 3',
        postNumber: 'SPS3A',
        components: [
            { reference: 'C158 7271 2283 30', category: '' },
            { reference: 'C77 7271 2283 30', category: '' },
            { reference: 'C214 7271 2283 30', category: '' },
        ],
    },
    {
        project: 'DPE',
        line: 'HABITACLE 3',
        postNumber: 'SPS4',
        components: [
            { reference: 'C230 7287 4314 80', category: '' },
            { reference: 'C94 7287 4314 80', category: '' },
            { reference: 'C3 7287 4314 80', category: '' },
        ],
    },
];
async function main() {
    console.log('Seeding projects and lines...');
    const projectCache = new Map();
    const lineCache = new Map();
    for (const [projectName, lines] of Object.entries(PROJECTS)) {
        const project = await prisma.project.upsert({
            where: { name: projectName },
            create: { name: projectName },
            update: {},
        });
        projectCache.set(projectName, project.id);
        console.log(`  Project: ${project.name}`);
        for (const lineName of lines) {
            const line = await prisma.line.upsert({
                where: { name_projectId: { name: lineName, projectId: project.id } },
                create: { name: lineName, projectId: project.id },
                update: {},
            });
            lineCache.set(`${projectName}::${lineName}`, line.id);
        }
    }
    const componentCache = new Map();
    for (const entry of POSTS) {
        const projectId = projectCache.get(entry.project);
        if (!projectId) {
            console.warn(`  Unknown project "${entry.project}" — skipped`);
            continue;
        }
        const lineId = lineCache.get(`${entry.project}::${entry.line}`);
        if (!lineId) {
            console.warn(`  Unknown line "${entry.line}" in "${entry.project}" — skipped`);
            continue;
        }
        const post = await prisma.post.upsert({
            where: { number_lineId: { number: entry.postNumber, lineId } },
            create: { number: entry.postNumber, lineId },
            update: {},
        });
        for (const comp of entry.components) {
            if (!componentCache.has(comp.reference)) {
                const c = await prisma.component.upsert({
                    where: { reference: comp.reference },
                    create: { reference: comp.reference, category: comp.category },
                    update: { category: comp.category },
                });
                componentCache.set(comp.reference, c.id);
            }
            const componentId = componentCache.get(comp.reference);
            await prisma.postComponent.upsert({
                where: { postId_componentId: { postId: post.id, componentId } },
                create: { postId: post.id, componentId, qrCode: (0, crypto_1.randomUUID)() },
                update: {},
            });
        }
        console.log(`  Post ${entry.project}/${entry.line}/${entry.postNumber} — ${entry.components.length} component(s)`);
    }
    console.log('Done.');
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map