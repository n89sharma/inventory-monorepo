-- Damage found when an asset is received. NULL means nobody has answered the question — every
-- asset predating this column — while false is a positive "inspected, no damage" claim. The
-- notes are only ever populated alongside is_damaged = true.

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "is_damaged" BOOLEAN;
ALTER TABLE "Asset" ADD COLUMN "damage_notes" TEXT;
