-- CreateTable
CREATE TABLE "LoanScheme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "annualInterestBp" INTEGER NOT NULL,
    "maxLtvBp" INTEGER NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LoanScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "grossWeightMg" INTEGER NOT NULL,
    "netWeightMg" INTEGER NOT NULL,
    "karat" INTEGER NOT NULL,
    "planId" TEXT NOT NULL,
    "pureGoldMg" INTEGER NOT NULL,
    "goldValuePaise" INTEGER NOT NULL,
    "loanRupees" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_mobileNumber_createdAt_idx" ON "Lead"("mobileNumber", "createdAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_planId_fkey" FOREIGN KEY ("planId") REFERENCES "LoanScheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
