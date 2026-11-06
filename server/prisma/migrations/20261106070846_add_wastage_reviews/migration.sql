-- CreateEnum
CREATE TYPE "WastageReviewStatus" AS ENUM ('PROVISIONAL', 'FINAL');

-- CreateEnum
CREATE TYPE "WastageAlertStatus" AS ENUM ('PENDING', 'RESOLVED');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "appliedWastagePercent" DECIMAL(6,3) NOT NULL DEFAULT 0,
ALTER COLUMN "dueDate" DROP DEFAULT;

-- CreateTable
CREATE TABLE "WastageReview" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "reviewEvent" VARCHAR(40) NOT NULL,
    "status" "WastageReviewStatus" NOT NULL,
    "issuedFineGold" DECIMAL(12,3) NOT NULL,
    "returnedFineGold" DECIMAL(12,3) NOT NULL,
    "allowedWastage" DECIMAL(12,3) NOT NULL,
    "actualDifference" DECIMAL(12,3) NOT NULL,
    "excessWastage" DECIMAL(12,3) NOT NULL,
    "submittedById" UUID NOT NULL,
    "approvedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WastageReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WastageAlert" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "reviewEvent" VARCHAR(40) NOT NULL,
    "status" "WastageAlertStatus" NOT NULL DEFAULT 'PENDING',
    "karigarCode" VARCHAR(32) NOT NULL,
    "karigarName" VARCHAR(120) NOT NULL,
    "jobNumber" VARCHAR(64) NOT NULL,
    "itemCategory" VARCHAR(80) NOT NULL,
    "issuedFineGold" DECIMAL(12,3) NOT NULL,
    "returnedFineGold" DECIMAL(12,3) NOT NULL,
    "allowedWastage" DECIMAL(12,3) NOT NULL,
    "actualDifference" DECIMAL(12,3) NOT NULL,
    "excessWastage" DECIMAL(12,3) NOT NULL,
    "resolvedById" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WastageAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WastageReview_status_idx" ON "WastageReview"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WastageReview_jobId_reviewEvent_key" ON "WastageReview"("jobId", "reviewEvent");

-- CreateIndex
CREATE INDEX "WastageAlert_status_idx" ON "WastageAlert"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WastageAlert_jobId_reviewEvent_key" ON "WastageAlert"("jobId", "reviewEvent");

-- AddForeignKey
ALTER TABLE "WastageReview" ADD CONSTRAINT "WastageReview_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WastageReview" ADD CONSTRAINT "WastageReview_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WastageReview" ADD CONSTRAINT "WastageReview_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WastageAlert" ADD CONSTRAINT "WastageAlert_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WastageAlert" ADD CONSTRAINT "WastageAlert_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
