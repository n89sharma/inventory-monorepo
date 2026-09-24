-- AlterTable
ALTER TABLE "User" ADD COLUMN     "last_seen_release_id" INTEGER;

-- CreateTable
CREATE TABLE "Release" (
    "id" SERIAL NOT NULL,
    "version" VARCHAR(50),
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" INTEGER NOT NULL,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseNote" (
    "id" SERIAL NOT NULL,
    "release_id" INTEGER NOT NULL,
    "section" VARCHAR(20) NOT NULL,
    "heading" TEXT,
    "link_area" VARCHAR(40),
    "permission_key" TEXT,
    "bullets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "ReleaseNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Release_published_at_idx" ON "Release"("published_at" DESC);

-- CreateIndex
CREATE INDEX "Release_created_by_id_idx" ON "Release"("created_by_id");

-- CreateIndex
CREATE INDEX "ReleaseNote_release_id_sort_order_idx" ON "ReleaseNote"("release_id", "sort_order");

-- CreateIndex
CREATE INDEX "ReleaseNote_permission_key_idx" ON "ReleaseNote"("permission_key");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_last_seen_release_id_fkey" FOREIGN KEY ("last_seen_release_id") REFERENCES "Release"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseNote" ADD CONSTRAINT "ReleaseNote_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseNote" ADD CONSTRAINT "ReleaseNote_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "Permission"("key") ON DELETE SET NULL ON UPDATE CASCADE;
