-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('PER_THOUSAND', 'FLAT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ServiceCategory" ADD VALUE 'UGC_CONTENT';
ALTER TYPE "ServiceCategory" ADD VALUE 'SHOUTOUT';
ALTER TYPE "ServiceCategory" ADD VALUE 'AD_CAMPAIGN';

-- AlterTable
ALTER TABLE "CreatorOffering" ADD COLUMN     "creatorFlatPrice" DECIMAL(10,2),
ADD COLUMN     "pricingModel" "PricingModel" NOT NULL DEFAULT 'PER_THOUSAND',
ALTER COLUMN "creatorPricePerThousand" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pricingModel" "PricingModel" NOT NULL DEFAULT 'PER_THOUSAND',
ADD COLUMN     "unitFlatPrice" DECIMAL(10,2),
ALTER COLUMN "unitPricePerThousand" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OrderAssignment" ADD COLUMN     "creatorFlatPrice" DECIMAL(10,2),
ADD COLUMN     "pricingModel" "PricingModel" NOT NULL DEFAULT 'PER_THOUSAND',
ALTER COLUMN "creatorPricePerThousand" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "flatPrice" DECIMAL(10,2),
ADD COLUMN     "pricingModel" "PricingModel" NOT NULL DEFAULT 'PER_THOUSAND',
ALTER COLUMN "pricePerThousand" DROP NOT NULL;
