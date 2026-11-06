const crypto = require("node:crypto");
const { Prisma } = require("@prisma/client");

const { calculateFineGold } = require("./fine-gold.service");
const { createWastageReview } = require("./wastage.service");

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

  const executeIssue = () => prisma.$transaction(async (transaction) => {
    const karigar = await transaction.karigar.findUnique({
      where: { id: karigarId },
      select: { id: true, isActive: true, karigarCode: true, name: true },
    });

    if (!karigar) {
      throw new GoldIssueError(404, "Karigar not found");
    }
    if (!karigar.isActive) {
      throw new GoldIssueError(400, "Gold cannot be issued to an inactive karigar");
    }

    const wastageRule = await transaction.wastageRule.findFirst({
      where: {
        karigarId,
        itemCategory: { equals: category, mode: "insensitive" },
      },
      select: { allowedWastagePercent: true },
    });
    if (!wastageRule) {
      throw new GoldIssueError(
        400,
        `No wastage rule is configured for category ${category}`,
      );
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
        appliedWastagePercent: wastageRule.allowedWastagePercent,
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

    await createWastageReview(
      transaction,
      {
        ...job,
        karigar: {
          karigarCode: karigar.karigarCode,
          name: karigar.name,
        },
        transactions: [{
          transactionType: goldTransaction.transactionType,
          fineWeight: goldTransaction.fineWeight,
        }],
      },
      createdById,
      "PROVISIONAL",
    );

    return {
      job: {
        id: job.id,
        jobNumber: job.jobNumber,
        category: job.itemCategory,
        dueDate: job.dueDate,
        notes: job.notes,
        status: job.status,
        appliedWastagePercent: job.appliedWastagePercent.toFixed(3),
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

  try {
    return await executeIssue();
  } catch (error) {
    if (error.code !== "P2034") throw error;
    return executeIssue();
  }
}

module.exports = {
  GoldIssueError,
  getAvailableVaultStock,
  issueGold,
};
