-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "deliveryInstructions" TEXT,
ADD COLUMN     "priority" TEXT,
ADD COLUMN     "recipientType" TEXT,
ADD COLUMN     "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "signatureUrl" TEXT,
ADD COLUMN     "temperatureRange" TEXT,
ADD COLUMN     "temperatureSensitive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Stop" ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "deliveryWindow" TEXT,
ADD COLUMN     "facilityName" TEXT,
ADD COLUMN     "facilityType" TEXT;
