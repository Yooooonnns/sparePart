-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ISSUED', 'CANCELLED');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "components" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_components" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "post_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_requests" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "notes" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedAt" TIMESTAMP(3),
    "issuedBy" TEXT,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "component_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_name_key" ON "projects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "lines_name_projectId_key" ON "lines"("name", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "posts_number_lineId_key" ON "posts"("number", "lineId");

-- CreateIndex
CREATE UNIQUE INDEX "components_reference_key" ON "components"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "post_components_qrCode_key" ON "post_components"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "post_components_postId_componentId_key" ON "post_components"("postId", "componentId");

-- CreateIndex
CREATE INDEX "component_requests_status_idx" ON "component_requests"("status");

-- CreateIndex
CREATE INDEX "component_requests_requestedAt_idx" ON "component_requests"("requestedAt");

-- AddForeignKey
ALTER TABLE "lines" ADD CONSTRAINT "lines_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_components" ADD CONSTRAINT "post_components_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_components" ADD CONSTRAINT "post_components_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_requests" ADD CONSTRAINT "component_requests_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_requests" ADD CONSTRAINT "component_requests_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
