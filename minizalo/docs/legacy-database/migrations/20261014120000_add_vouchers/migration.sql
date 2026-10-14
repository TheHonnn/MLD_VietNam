CREATE TYPE "VoucherScope" AS ENUM ('SERVICE', 'COURSE', 'ALL');
CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENT');

CREATE TABLE "Voucher" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "scope" "VoucherScope" NOT NULL,
  "discountType" "DiscountType" NOT NULL,
  "discountValue" INTEGER NOT NULL,
  "maxDiscountAmount" INTEGER,
  "minOrderValue" INTEGER NOT NULL DEFAULT 0,
  "applicableCategories" TEXT[] NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usageLimit" INTEGER,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserVoucher" (
  "userId" TEXT NOT NULL,
  "voucherId" TEXT NOT NULL,
  "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" TIMESTAMP(3),
  CONSTRAINT "UserVoucher_pkey" PRIMARY KEY ("userId", "voucherId")
);

CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");
CREATE INDEX "UserVoucher_userId_usedAt_idx" ON "UserVoucher"("userId", "usedAt");
ALTER TABLE "UserVoucher" ADD CONSTRAINT "UserVoucher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserVoucher" ADD CONSTRAINT "UserVoucher_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
