-- CreateEnum
CREATE TYPE "CreatorVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CreatorOfferingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');

-- CreateTable
CREATE TABLE "CreatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "verificationStatus" "CreatorVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorOffering" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "creatorPricePerThousand" DECIMAL(10,2) NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "maxQuantity" INTEGER NOT NULL,
    "notes" TEXT,
    "status" "CreatorOfferingStatus" NOT NULL DEFAULT 'PENDING',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAssignment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "creatorOfferingId" TEXT NOT NULL,
    "creatorPricePerThousand" DECIMAL(10,2) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'OFFERED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorEarning" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "orderAssignmentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payoutRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutRequest" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PayoutRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "adminNotes" TEXT,

    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_userId_key" ON "CreatorProfile"("userId");

-- CreateIndex
CREATE INDEX "CreatorOffering_serviceId_idx" ON "CreatorOffering"("serviceId");

-- CreateIndex
CREATE INDEX "CreatorOffering_status_idx" ON "CreatorOffering"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorOffering_creatorProfileId_serviceId_key" ON "CreatorOffering"("creatorProfileId", "serviceId");

-- CreateIndex
CREATE INDEX "OrderAssignment_orderId_idx" ON "OrderAssignment"("orderId");

-- CreateIndex
CREATE INDEX "OrderAssignment_creatorProfileId_idx" ON "OrderAssignment"("creatorProfileId");

-- CreateIndex
CREATE INDEX "OrderAssignment_creatorOfferingId_idx" ON "OrderAssignment"("creatorOfferingId");

-- CreateIndex
CREATE INDEX "OrderAssignment_status_idx" ON "OrderAssignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorEarning_orderAssignmentId_key" ON "CreatorEarning"("orderAssignmentId");

-- CreateIndex
CREATE INDEX "CreatorEarning_creatorProfileId_idx" ON "CreatorEarning"("creatorProfileId");

-- CreateIndex
CREATE INDEX "CreatorEarning_payoutRequestId_idx" ON "CreatorEarning"("payoutRequestId");

-- CreateIndex
CREATE INDEX "PayoutRequest_creatorProfileId_idx" ON "PayoutRequest"("creatorProfileId");

-- CreateIndex
CREATE INDEX "PayoutRequest_status_idx" ON "PayoutRequest"("status");

-- AddForeignKey
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorOffering" ADD CONSTRAINT "CreatorOffering_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorOffering" ADD CONSTRAINT "CreatorOffering_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAssignment" ADD CONSTRAINT "OrderAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAssignment" ADD CONSTRAINT "OrderAssignment_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAssignment" ADD CONSTRAINT "OrderAssignment_creatorOfferingId_fkey" FOREIGN KEY ("creatorOfferingId") REFERENCES "CreatorOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorEarning" ADD CONSTRAINT "CreatorEarning_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorEarning" ADD CONSTRAINT "CreatorEarning_orderAssignmentId_fkey" FOREIGN KEY ("orderAssignmentId") REFERENCES "OrderAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorEarning" ADD CONSTRAINT "CreatorEarning_payoutRequestId_fkey" FOREIGN KEY ("payoutRequestId") REFERENCES "PayoutRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
