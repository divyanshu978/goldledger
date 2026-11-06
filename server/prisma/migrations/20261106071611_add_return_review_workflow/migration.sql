-- CreateEnum
CREATE TYPE "ReturnReviewStatus" AS ENUM ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "ReturnReview" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "status" "ReturnReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewerId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnReview_transactionId_key" ON "ReturnReview"("transactionId");

-- AddForeignKey
ALTER TABLE "ReturnReview" ADD CONSTRAINT "ReturnReview_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "GoldTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnReview" ADD CONSTRAINT "ReturnReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
