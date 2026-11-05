const crypto = require("node:crypto");
const { Prisma } = require("@prisma/client");

const { calculateFineGold } = require("./fine-gold.service");

class GoldIssueError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function createJobNumber() {
  return `JOB-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function createTransactionId() {
  return `ISSUE-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

async function getAvailableVaultStock(transaction) {
  const totals = await transaction.goldTransaction.groupBy({
    by: ["transactionType"],
    _sum: { fineWeight: true },
  });

  return totals.reduce((available, total) => {
    const weight = total._sum.fineWeight ?? new Prisma.Decimal(0);
    return total.transactionType === "RECEIPT"
      ? available.add(weight)
      : available.sub(weight);
  }, new Prisma.Decimal(0));
}

async function issueGold(prisma, { karigarId, grossWeight, purity, category, dueDate, notes, createdById }) {
  const calculation = calculateFineGold({ grossWeight, purity });

  return prisma.$transaction(async (transaction) => {
    const karigar = await transaction.karigar.findUnique({
      where: { id: karigarId },
      select: { id: true, isActive: true },
    });

    if (!karigar) {
      throw new GoldIssueError(404, "Karigar not found");
    }
    if (!karigar.isActive) {
      throw new GoldIssueError(400, "Gold cannot be issued to an inactive karigar");
    }

    const availableStock = await getAvailableVaultStock(transaction);
    const fineWeight = new Prisma.Decimal(calculation.fineWeight);
    if (availableStock.lt(fineWeight)) {
      throw new GoldIssueError(
        409,
        `Insufficient vault stock. Available fine gold: ${availableStock.toFixed(3)}g`,
      );
    }

    const job = await transaction.job.create({
      data: {
        jobNumber: createJobNumber(),
        karigarId,
        itemCategory: category,
        dueDate,
        notes: notes || null,
      },
    });

    const goldTransaction = await transaction.goldTransaction.create({
      data: {
        transactionId: createTransactionId(),
        transactionType: "ISSUE",
        jobId: job.id,
        karigarId,
        grossWeight: calculation.grossWeight,
        purity: calculation.purity,
        fineWeight: calculation.fineWeight,
        createdById,
      },
    });

    return {
      job: {
        id: job.id,
        jobNumber: job.jobNumber,
        category: job.itemCategory,
        dueDate: job.dueDate,
        notes: job.notes,
        status: job.status,
      },
      transaction: {
        id: goldTransaction.id,
        transactionId: goldTransaction.transactionId,
        transactionType: goldTransaction.transactionType,
        grossWeight: goldTransaction.grossWeight.toFixed(3),
        purity: goldTransaction.purity.toFixed(2),
        fineWeight: goldTransaction.fineWeight.toFixed(3),
        createdById: goldTransaction.createdById,
        createdAt: goldTransaction.createdAt,
      },
      availableVaultStock: availableStock.sub(fineWeight).toFixed(3),
    };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

module.exports = {
  GoldIssueError,
  getAvailableVaultStock,
  issueGold,
};
