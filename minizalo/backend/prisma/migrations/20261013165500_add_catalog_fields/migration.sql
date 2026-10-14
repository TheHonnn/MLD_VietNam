/*
  Warnings:

  - Added the required column `city` to the `Branch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `specialty` to the `Specialist` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "city" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "badge" TEXT,
ADD COLUMN     "indicatorsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "originalPrice" DECIMAL(12,0),
ADD COLUMN     "preparationNotes" TEXT[],
ADD COLUMN     "rating" DECIMAL(2,1) NOT NULL DEFAULT 0,
ADD COLUMN     "reviewsCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Specialist" ADD COLUMN     "consultationFee" DECIMAL(12,0) NOT NULL DEFAULT 0,
ADD COLUMN     "reviewsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "specialty" TEXT NOT NULL,
ADD COLUMN     "workplace" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "dob" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "tier" TEXT NOT NULL DEFAULT 'Silver';
