const bcrypt = require("bcrypt");

const { prisma, pool } = require("../src/lib/prisma");

async function main() {
  const passwordHash = await bcrypt.hash("Demo123!", 12);

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

  const karigar = await prisma.karigar.upsert({
    where: { karigarCode: "KAR-001" },
    update: {},
    create: {
      karigarCode: "KAR-001",
      name: "Murugesan",
      phone: "9000000001",
    },
  });

  await prisma.wastageRule.upsert({
    where: {
      karigarId_itemCategory: {
        karigarId: karigar.id,
        itemCategory: "NECKLACE",
      },
    },
    update: {},
    create: {
      karigarId: karigar.id,
      itemCategory: "NECKLACE",
      allowedWastagePercent: "3.000",
    },
  });

  const job = await prisma.job.upsert({
    where: { jobNumber: "JOB-001" },
    update: {},
    create: {
      jobNumber: "JOB-001",
      karigarId: karigar.id,
      itemCategory: "NECKLACE",
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

  console.log(`Seeded users, karigar ${karigar.karigarCode}, and job ${job.jobNumber}.`);
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
