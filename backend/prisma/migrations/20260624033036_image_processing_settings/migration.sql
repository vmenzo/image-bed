-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "avifKey" TEXT,
ADD COLUMN     "avifUrl" TEXT,
ADD COLUMN     "webpKey" TEXT,
ADD COLUMN     "webpUrl" TEXT;

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "publicBaseUrl" TEXT,
    "maxSizeBytes" INTEGER NOT NULL DEFAULT 52428800,
    "allowedTypes" TEXT[] DEFAULT ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::TEXT[],
    "defaultVisibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "generateThumbnail" BOOLEAN NOT NULL DEFAULT true,
    "generateWebp" BOOLEAN NOT NULL DEFAULT true,
    "generateAvif" BOOLEAN NOT NULL DEFAULT false,
    "stripMetadata" BOOLEAN NOT NULL DEFAULT true,
    "watermark" BOOLEAN NOT NULL DEFAULT false,
    "watermarkText" TEXT NOT NULL DEFAULT 'PicVault',
    "hotlinkProtection" BOOLEAN NOT NULL DEFAULT false,
    "uploadAudit" BOOLEAN NOT NULL DEFAULT false,
    "apiUpload" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_ownerId_key" ON "AppSetting"("ownerId");

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
