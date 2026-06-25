CREATE SEQUENCE "User_publicId_seq" START WITH 1 INCREMENT BY 1;

ALTER TABLE "User" ADD COLUMN "publicId" INTEGER;

WITH numbered AS (
  SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS rn
  FROM "User"
)
UPDATE "User"
SET "publicId" = numbered.rn
FROM numbered
WHERE "User"."id" = numbered."id";

SELECT setval(
  '"User_publicId_seq"',
  GREATEST((SELECT COALESCE(MAX("publicId"), 0) FROM "User"), 1),
  true
);

ALTER TABLE "User"
ALTER COLUMN "publicId" SET NOT NULL,
ALTER COLUMN "publicId" SET DEFAULT nextval('"User_publicId_seq"');

ALTER SEQUENCE "User_publicId_seq" OWNED BY "User"."publicId";

CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");

CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

ALTER TABLE "AuthSession"
ADD CONSTRAINT "AuthSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
