CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'CANCELLED');

ALTER TABLE "TreatmentPlan" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "TreatmentPlan" ADD COLUMN "notes" TEXT;

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bookingId" TEXT,
  "enrollmentId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(12,0) NOT NULL,
  "discount" DECIMAL(12,0) NOT NULL DEFAULT 0,
  "finalAmount" DECIMAL(12,0) NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PointTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invoice_code_key" ON "Invoice"("code");
CREATE UNIQUE INDEX "Invoice_bookingId_key" ON "Invoice"("bookingId");
CREATE UNIQUE INDEX "Invoice_enrollmentId_key" ON "Invoice"("enrollmentId");
CREATE INDEX "Invoice_userId_createdAt_idx" ON "Invoice"("userId", "createdAt");
CREATE INDEX "PointTransaction_userId_createdAt_idx" ON "PointTransaction"("userId", "createdAt");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
