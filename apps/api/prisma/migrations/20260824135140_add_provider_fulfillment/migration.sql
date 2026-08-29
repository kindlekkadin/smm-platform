-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "ProviderSubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "apiEndpoint" TEXT,
    "apiKeySecret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" "ProviderStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderServiceMapping" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "providerServiceId" TEXT NOT NULL,
    "providerPricePerThousand" DECIMAL(10,2),
    "minQuantity" INTEGER,
    "maxQuantity" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderServiceMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderOrderSubmission" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerServiceMappingId" TEXT NOT NULL,
    "providerOrderRef" TEXT,
    "externalStatus" TEXT,
    "status" "ProviderSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "responseLog" JSONB,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderOrderSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provider_code_key" ON "Provider"("code");

-- CreateIndex
CREATE INDEX "ProviderServiceMapping_serviceId_idx" ON "ProviderServiceMapping"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderServiceMapping_providerId_serviceId_key" ON "ProviderServiceMapping"("providerId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderOrderSubmission_providerOrderRef_key" ON "ProviderOrderSubmission"("providerOrderRef");

-- CreateIndex
CREATE INDEX "ProviderOrderSubmission_orderId_idx" ON "ProviderOrderSubmission"("orderId");

-- CreateIndex
CREATE INDEX "ProviderOrderSubmission_providerId_idx" ON "ProviderOrderSubmission"("providerId");

-- CreateIndex
CREATE INDEX "ProviderOrderSubmission_status_idx" ON "ProviderOrderSubmission"("status");

-- AddForeignKey
ALTER TABLE "ProviderServiceMapping" ADD CONSTRAINT "ProviderServiceMapping_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderServiceMapping" ADD CONSTRAINT "ProviderServiceMapping_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOrderSubmission" ADD CONSTRAINT "ProviderOrderSubmission_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOrderSubmission" ADD CONSTRAINT "ProviderOrderSubmission_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOrderSubmission" ADD CONSTRAINT "ProviderOrderSubmission_providerServiceMappingId_fkey" FOREIGN KEY ("providerServiceMappingId") REFERENCES "ProviderServiceMapping"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
