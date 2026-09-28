-- AlterTable
ALTER TABLE "AssetTransfer" ADD COLUMN     "loaded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unloaded" BOOLEAN NOT NULL DEFAULT false;
