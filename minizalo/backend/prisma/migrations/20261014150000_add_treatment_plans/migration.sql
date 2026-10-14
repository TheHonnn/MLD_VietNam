CREATE TYPE "TreatmentPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "TreatmentSessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

CREATE TABLE "TreatmentPlan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "totalSessions" INTEGER NOT NULL,
  "status" "TreatmentPlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TreatmentPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TreatmentSession" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "sessionNumber" INTEGER NOT NULL,
  "status" "TreatmentSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "scheduledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "specialistName" TEXT,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TreatmentSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TreatmentPlan_userId_status_idx" ON "TreatmentPlan"("userId", "status");
CREATE UNIQUE INDEX "TreatmentSession_planId_sessionNumber_key" ON "TreatmentSession"("planId", "sessionNumber");
CREATE INDEX "TreatmentSession_planId_status_idx" ON "TreatmentSession"("planId", "status");
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TreatmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
