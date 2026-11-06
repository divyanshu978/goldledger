const bcrypt = require("bcrypt");

const { prisma, pool } = require("../src/lib/prisma");

async function main() {
  const passwordHash = await bcrypt.hash("Demo123!", 12);
  const testClerkPasswordHash = await bcrypt.hash("ClerkPassword123!", 12);
  const testFinancePasswordHash = await bcrypt.hash("FinancePassword123!", 12);

  const clerk = await prisma.user.upsert({
    where: { email: "clerk@goldledger.demo" },
    update: {},
    create: {
      name: "Issue Clerk",
      email: "clerk@goldledger.demo",
      passwordHash,
      role: "ISSUE_CLERK",
    },
  });

  const financeHead = await prisma.user.upsert({
    where: { email: "finance@goldledger.demo" },
    update: {},
    create: {
      name: "Finance Head",
      email: "finance@goldledger.demo",
      passwordHash,
      role: "FINANCE_HEAD",
    },
  });

  await prisma.user.upsert({
    where: { email: "auth-clerk@goldledger.test" },
    update: {
      passwordHash: testClerkPasswordHash,
      isActive: true,
      role: "ISSUE_CLERK",
    },
    create: {
      name: "Auth Test Clerk",
      email: "auth-clerk@goldledger.test",
      passwordHash: testClerkPasswordHash,
      role: "ISSUE_CLERK",
    },
  });

  await prisma.user.upsert({
    where: { email: "auth-finance@goldledger.test" },
    update: {
      passwordHash: testFinancePasswordHash,
      isActive: true,
      role: "FINANCE_HEAD",
    },
    create: {
      name: "Auth Test Finance",
      email: "auth-finance@goldledger.test",
      passwordHash: testFinancePasswordHash,
      role: "FINANCE_HEAD",
    },
  });

  const karigarSeeds = [
    {
      karigarCode: "KAR-001",
      name: "Murugesan S",
      phone: "9000000001",
      rules: {
        Necklace: "3.000",
        Ring: "1.500",
        Chain: "2.250",
        Bracelet: "2.000",
      },
    },
    {
      karigarCode: "KAR-002",
      name: "Kumar R",
      phone: "9000000002",
      rules: {
        Necklace: "2.750",
        Ring: "1.250",
        Chain: "2.000",
        Bracelet: "1.750",
      },
    },
    {
      karigarCode: "KAR-003",
      name: "Selvam P",
      phone: "9000000003",
      rules: {
        Necklace: "3.250",
        Ring: "1.750",
        Chain: "2.500",
        Bracelet: "2.250",
      },
    },
    {
      karigarCode: "KAR-004",
      name: "Ravi K",
      phone: "9000000004",
      rules: {
        Necklace: "2.500",
        Ring: "1.000",
        Chain: "1.750",
        Bracelet: "1.500",
      },
    },
    {
      karigarCode: "KAR-005",
      name: "Mani S",
      phone: "9000000005",
      rules: {
        Necklace: "3.500",
        Ring: "2.000",
        Chain: "2.750",
        Bracelet: "2.500",
      },
    },
  ];

  const karigars = [];
  for (const seed of karigarSeeds) {
    const karigar = await prisma.karigar.upsert({
      where: { karigarCode: seed.karigarCode },
      update: {
        name: seed.name,
        phone: seed.phone,
        isActive: true,
      },
      create: {
        karigarCode: seed.karigarCode,
        name: seed.name,
        phone: seed.phone,
      },
    });

    karigars.push(karigar);

    for (const [itemCategory, allowedWastagePercent] of Object.entries(seed.rules)) {
      await prisma.wastageRule.upsert({
        where: {
          karigarId_itemCategory: {
            karigarId: karigar.id,
            itemCategory,
          },
        },
        update: { allowedWastagePercent },
        create: {
          karigarId: karigar.id,
          itemCategory,
          allowedWastagePercent,
        },
      });
    }
  }

  const karigar = karigars[0];

  const job = await prisma.job.upsert({
    where: { jobNumber: "JOB-001" },
    update: {
      dueDate: new Date("2026-11-30T00:00:00.000Z"),
      notes: "Seeded demo issue job.",
      appliedWastagePercent: "3.000",
    },
    create: {
      jobNumber: "JOB-001",
      karigarId: karigar.id,
      itemCategory: "NECKLACE",
      dueDate: new Date("2026-11-30T00:00:00.000Z"),
      notes: "Seeded demo issue job.",
      appliedWastagePercent: "3.000",
    },
  });

  await prisma.goldTransaction.upsert({
    where: { transactionId: "TX-30411" },
    update: {},
    create: {
      transactionId: "TX-30411",
      transactionType: "ISSUE",
      jobId: job.id,
      karigarId: karigar.id,
      grossWeight: "120.000",
      purity: "91.60",
      fineWeight: "109.920",
      createdById: clerk.id,
    },
  });

  const openingJob = await prisma.job.upsert({
    where: { jobNumber: "JOB-OPENING-STOCK" },
    update: {
      dueDate: new Date("2026-11-05T00:00:00.000Z"),
      notes: "Development-only opening vault stock.",
      appliedWastagePercent: "0.000",
    },
    create: {
      jobNumber: "JOB-OPENING-STOCK",
      karigarId: karigar.id,
      itemCategory: "OPENING_STOCK",
      dueDate: new Date("2026-11-05T00:00:00.000Z"),
      notes: "Development-only opening vault stock.",
      appliedWastagePercent: "0.000",
    },
  });

  await prisma.goldTransaction.upsert({
    where: { transactionId: "TX-OPENING-STOCK" },
    update: {},
    create: {
      transactionId: "TX-OPENING-STOCK",
      transactionType: "RECEIPT",
      jobId: openingJob.id,
      karigarId: karigar.id,
      grossWeight: "500.000",
      purity: "100.00",
      fineWeight: "500.000",
      createdById: financeHead.id,
    },
  });

  console.log(`Seeded demo and auth test users, ${karigars.length} karigars, and job ${job.jobNumber}.`);
  console.log(`Finance user: ${financeHead.email}`);
}

main()
  .catch((error) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
