const crypto = require("node:crypto");
const { Prisma } = require("@prisma/client");

const { calculateFineGold } = require("./fine-gold.service");

class GoldReturnError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function createTransactionId() {
  return `RETURN-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function decimal(value) {
  return value ?? new Prisma.Decimal(0);
}

function getOutstandingBalance(transactions) {
  return transactions.reduce((balance, transaction) => {
    const weight = decimal(transaction.fineWeight);
    return transaction.transactionType === "ISSUE"
      ? balance.add(weight)
      : balance.sub(weight);
  }, new Prisma.Decimal(0));
}

function serializeJob(job, outstandingFineGold) {
  return {
    id: job.id,
    jobNumber: job.jobNumber,
    category: job.itemCategory,
    dueDate: job.dueDate,
    status: job.status,
    karigar: {
      id: job.karigar.id,
      code: job.karigar.karigarCode,
      name: job.karigar.name,
    },
    issuedFineGold: job.transactions
      .filter((transaction) => transaction.transactionType === "ISSUE")
      .reduce((sum, transaction) => sum.add(transaction.fineWeight), new Prisma.Decimal(0))
      .toFixed(3),
    returnedFineGold: job.transactions
      .filter((transaction) => transaction.transactionType === "RECEIPT")
      .reduce((sum, transaction) => sum.add(transaction.fineWeight), new Prisma.Decimal(0))
      .toFixed(3),
    outstandingFineGold: outstandingFineGold.toFixed(3),
  };
}

async function listOutstandingJobs(prisma) {
  const jobs = await prisma.job.findMany({
    where: { status: { in: ["OPEN", "PARTIALLY_RETURNED"] } },
    include: {
      karigar: { select: { id: true, karigarCode: true, name: true } },
      transactions: {
        select: { transactionType: true, fineWeight: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return jobs
    .map((job) => ({ job, outstanding: getOutstandingBalance(job.transactions) }))
    .filter(({ outstanding }) => outstanding.gt(0))
    .map(({ job, outstanding }) => serializeJob(job, outstanding));
}

async function returnGold(prisma, { jobId, returnType, grossWeight, purity, notes, createdById }) {
  const calculation = calculateFineGold({ grossWeight, purity });

  return prisma.$transaction(async (transaction) => {
    const job = await transaction.job.findUnique({
      where: { id: jobId },
      include: {
        karigar: { select: { id: true, karigarCode: true, name: true } },
        transactions: { select: { transactionType: true, fineWeight: true } },
      },
    });

    if (!job) {
      throw new GoldReturnError(404, "Job not found");
    }

    const outstanding = getOutstandingBalance(job.transactions);
    const returnedFineGold = new Prisma.Decimal(calculation.fineWeight);
    if (outstanding.lte(0)) {
      throw new GoldReturnError(409, "This job has no outstanding fine-gold balance");
    }
    if (returnedFineGold.gt(outstanding)) {
      throw new GoldReturnError(
        409,
        `Return exceeds the outstanding fine gold balance of ${outstanding.toFixed(3)}g`,
      );
    }

    const remaining = outstanding.sub(returnedFineGold);
    const updatedStatus = remaining.eq(0) ? "COMPLETED" : "PARTIALLY_RETURNED";

    const goldTransaction = await transaction.goldTransaction.create({
      data: {
        transactionId: createTransactionId(),
        transactionType: "RECEIPT",
        returnType,
        notes: notes || null,
        jobId: job.id,
        karigarId: job.karigarId,
        grossWeight: calculation.grossWeight,
        purity: calculation.purity,
        fineWeight: calculation.fineWeight,
        createdById,
      },
    });

    const updatedJob = await transaction.job.update({
      where: { id: job.id },
      data: { status: updatedStatus },
      include: {
        karigar: { select: { id: true, karigarCode: true, name: true } },
        transactions: { select: { transactionType: true, fineWeight: true } },
      },
    });

    return {
      job: serializeJob(updatedJob, remaining),
      transaction: {
        id: goldTransaction.id,
        transactionId: goldTransaction.transactionId,
        transactionType: goldTransaction.transactionType,
        returnType: goldTransaction.returnType,
        grossWeight: goldTransaction.grossWeight.toFixed(3),
        purity: goldTransaction.purity.toFixed(2),
        fineWeight: goldTransaction.fineWeight.toFixed(3),
        notes: goldTransaction.notes,
        createdAt: goldTransaction.createdAt,
      },
    };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

module.exports = {
  GoldReturnError,
  getOutstandingBalance,
  listOutstandingJobs,
  returnGold,
};
