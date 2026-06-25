CREATE TYPE "StorageProvider" AS ENUM ('S3', 'LOCAL');

ALTER TABLE "Image"
ADD COLUMN "storageProvider" "StorageProvider" NOT NULL DEFAULT 'S3';

ALTER TABLE "AppSetting"
ADD COLUMN "storageProvider" "StorageProvider" NOT NULL DEFAULT 'S3',
ADD COLUMN "s3Endpoint" TEXT,
ADD COLUMN "s3Region" TEXT,
ADD COLUMN "s3Bucket" TEXT,
ADD COLUMN "s3AccessKey" TEXT,
ADD COLUMN "s3SecretKey" TEXT,
ADD COLUMN "s3ForcePathStyle" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "localStoragePath" TEXT,
ADD COLUMN "telegramBotEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "telegramBotToken" TEXT,
ADD COLUMN "telegramAllowedChatIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "telegramAlbumId" TEXT,
ADD COLUMN "telegramLastUpdateId" INTEGER;
