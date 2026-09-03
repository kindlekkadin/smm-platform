-- CreateEnum
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');

-- AlterEnum
ALTER TYPE "WalletTransactionType" ADD VALUE 'MANUAL_TOP_UP';

-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN     "referenceNumber" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByAdminId" TEXT,
ADD COLUMN     "status" "WalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED';

-- CreateTable
CREATE TABLE "ManualTopUpSettings" (
    "id" TEXT NOT NULL,
    "qrPhImageUrl" TEXT,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "bankName" TEXT,
    "instructions" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualTopUpSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE INDEX "WalletTransaction_status_idx" ON "WalletTransaction"("status");
