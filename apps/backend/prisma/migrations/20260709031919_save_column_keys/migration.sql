-- AlterTable
ALTER TABLE "SavedView" ADD COLUMN     "column_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
