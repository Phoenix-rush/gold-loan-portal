import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.loanScheme.upsert({
    where: { id: "PLAN_BULLET_01" },
    update: {},
    create: {
      id: "PLAN_BULLET_01",
      name: "Bullet Repayment",
      annualInterestBp: 1200,
      maxLtvBp: 7000,
      tenureMonths: 12,
      description: "Interest + principal at maturity",
    },
  });
  await prisma.loanScheme.upsert({
    where: { id: "PLAN_EMI_01" },
    update: {},
    create: {
      id: "PLAN_EMI_01",
      name: "Monthly EMI",
      annualInterestBp: 1050,
      maxLtvBp: 7500,
      tenureMonths: 12,
      description: "Equal monthly instalments",
    },
  });
}

main().finally(() => prisma.$disconnect());