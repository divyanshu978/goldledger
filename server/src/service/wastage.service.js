const { Prisma } = require("@prisma/client");

const WASTAGE_SCALE = 3;

class WastageError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function sumTransactions(transactions, type) {
  return transactions
    .filter((transaction) => transaction.transactionType === type)
    .reduce((total, transaction) => total.add(transaction.fineWeight), new Prisma.Decimal(0));
}

function calculateWastage({ issuedFineGold, returnedFineGold, allowedWastagePercent }) {
  const issued = new Prisma.Decimal(issuedFineGold);
  const returned = new Prisma.Decimal(returnedFineGold);
  const percentage = new Prisma.Decimal(allowedWastagePercent);
  const actualDifference = issued
    .sub(returned)
    .toDecimalPlaces(WASTAGE_SCALE, Prisma.Decimal.ROUND_HALF_UP);
  const allowedWastage = issued
    .mul(percentage)
    .div(100)
    .toDecimalPlaces(WASTAGE_SCALE, Prisma.Decimal.ROUND_HALF_UP);
  const excessWastage = Prisma.Decimal.max(
    new Prisma.Decimal(0),
    actualDifference.sub(allowedWastage),
  ).toDecimalPlaces(WASTAGE_SCALE, Prisma.Decimal.ROUND_HALF_UP);

  return {
    issuedFineGold: issued.toDecimalPlaces(WASTAGE_SCALE, Prisma.Decimal.ROUND_HALF_UP),
    returnedFineGold: returned.toDecimalPlaces(WASTAGE_SCALE, Prisma.Decimal.ROUND_HALF_UP),
    allowedWastage,
    actualDifference,
    excessWastage,
  };
}

function serializeWastage(job, calculation, status, reviewEvent, alert) {
  return {
    job: {
      id: job.id,
      jobNumber: job.jobNumber,
      category: job.itemCategory,
      status: job.status,
      dueDate: job.dueDate,
      appliedWastagePercent: job.appliedWastagePercent.toFixed(3),
      karigar: {
        id: job.karigar.id,
        code: job.karigar.karigarCode,
        name: job.karigar.name,
      },
    },
    status,
    reviewEvent,
    issuedFineGold: calculation.issuedFineGold.toFixed(WASTAGE_SCALE),
    returnedFineGold: calculation.returnedFineGold.toFixed(WASTAGE_SCALE),
    allowedWastage: calculation.allowedWastage.toFixed(WASTAGE_SCALE),
    actualDifference: calculation.actualDifference.toFixed(WASTAGE_SCALE),
    excessWastage: calculation.excessWastage.toFixed(WASTAGE_SCALE),
    alert: alert
      ? {
          id: alert.id,
          status: alert.status,
          createdAt: alert.createdAt,
          resolvedAt: alert.resolvedAt,
        }
      : null,
  };
}

function getCalculation(job) {
  return calculateWastage({
    issuedFineGold: sumTransactions(job.transactions, "ISSUE"),
    returnedFineGold: sumTransactions(job.transactions, "RECEIPT"),
    allowedWastagePercent: job.appliedWastagePercent,
  });
}

function getReviewEvent(job) {
  return job.status === "COMPLETED" ? "COMPLETED" : "FINANCE_REVIEW";
}

function getStatus(job, review) {
  if (review?.status === "FINAL" || job.status === "COMPLETED") return "FINAL";
  return "PROVISIONAL";
}

async function loadJob(prisma, jobId) {
  return prisma.job.findUnique({
    where: { id: jobId },
    include: {
      karigar: { select: { id: true, karigarCode: true, name: true } },
      transactions: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          transactionId: true,
          transactionType: true,
          returnType: true,
          grossWeight: true,
          purity: true,
          fineWeight: true,
          notes: true,
          createdAt: true,
        },
      },
      wastageReviews: { orderBy: { createdAt: "desc" }, take: 1 },
      wastageAlerts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

async function getJobWastage(prisma, jobId) {
  const job = await loadJob(prisma, jobId);
  if (!job) throw new WastageError(404, "Job not found");
  const review = job.wastageReviews[0];
  const calculation = review
    ? {
        issuedFineGold: review.issuedFineGold,
        returnedFineGold: review.returnedFineGold,
        allowedWastage: review.allowedWastage,
        actualDifference: review.actualDifference,
        excessWastage: review.excessWastage,
      }
    : getCalculation(job);
  return {
    ...serializeWastage(
      job,
      calculation,
      getStatus(job, review),
      review?.reviewEvent ?? getReviewEvent(job),
      job.wastageAlerts[0],
    ),
    transactions: job.transactions.map((transaction) => ({
      id: transaction.id,
      transactionId: transaction.transactionId,
      type: transaction.transactionType,
      returnType: transaction.returnType,
      grossWeight: transaction.grossWeight.toFixed(3),
      purity: transaction.purity.toFixed(2),
      fineGold: transaction.fineWeight.toFixed(3),
      notes: transaction.notes,
      date: transaction.createdAt,
    })),
  };
}

async function createWastageReview(transaction, job, submittedById, reviewEvent, approve = false) {
  const calculation = getCalculation(job);
  const status = reviewEvent === "PROVISIONAL" ? "PROVISIONAL" : "FINAL";
  const review = await transaction.wastageReview.upsert({
    where: { jobId_reviewEvent: { jobId: job.id, reviewEvent } },
    update: {
      status,
      ...calculation,
      submittedById,
      ...(approve ? { approvedById: submittedById } : {}),
    },
    create: {
      jobId: job.id,
      reviewEvent,
      status,
      ...calculation,
      submittedById,
      approvedById: approve ? submittedById : null,
    },
  });

  let alert = await transaction.wastageAlert.findUnique({
    where: { jobId_reviewEvent: { jobId: job.id, reviewEvent } },
  });
  if (calculation.excessWastage.gt(0) && !alert) {
    alert = await transaction.wastageAlert.create({
      data: {
        jobId: job.id,
        reviewEvent,
        karigarCode: job.karigar.karigarCode,
        karigarName: job.karigar.name,
        jobNumber: job.jobNumber,
        itemCategory: job.itemCategory,
        issuedFineGold: calculation.issuedFineGold,
        returnedFineGold: calculation.returnedFineGold,
        allowedWastage: calculation.allowedWastage,
        actualDifference: calculation.actualDifference,
        excessWastage: calculation.excessWastage,
      },
    });
  } else if (alert && calculation.excessWastage.gt(0)) {
    alert = await transaction.wastageAlert.update({
      where: { id: alert.id },
      data: {
        issuedFineGold: calculation.issuedFineGold,
        returnedFineGold: calculation.returnedFineGold,
        allowedWastage: calculation.allowedWastage,
        actualDifference: calculation.actualDifference,
        excessWastage: calculation.excessWastage,
      },
    });
  }
  return { review, alert, calculation };
}

async function submitForReview(prisma, jobId, submittedById) {
  return prisma.$transaction(async (transaction) => {
    const job = await transaction.job.findUnique({
      where: { id: jobId },
      include: {
        karigar: { select: { id: true, karigarCode: true, name: true } },
        transactions: { select: { transactionType: true, fineWeight: true } },
      },
    });
    if (!job) throw new WastageError(404, "Job not found");
    if (job.status === "COMPLETED") {
      throw new WastageError(409, "Completed jobs are already finalized");
    }
    const result = await createWastageReview(transaction, job, submittedById, "FINANCE_REVIEW", true);
    return serializeWastage(job, result.calculation, "FINAL", "FINANCE_REVIEW", result.alert);
  });
}

async function listWastage(prisma, statusFilter = "all") {
  const jobs = await prisma.job.findMany({
    where: { transactions: { some: { transactionType: "ISSUE" } } },
    include: {
      karigar: { select: { id: true, karigarCode: true, name: true } },
      transactions: { select: { transactionType: true, fineWeight: true } },
      wastageReviews: { orderBy: { createdAt: "desc" }, take: 1 },
      wastageAlerts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  return jobs
    .map((job) => {
      const review = job.wastageReviews[0];
      const calculation = review
        ? {
            issuedFineGold: review.issuedFineGold,
            returnedFineGold: review.returnedFineGold,
            allowedWastage: review.allowedWastage,
            actualDifference: review.actualDifference,
            excessWastage: review.excessWastage,
          }
        : getCalculation(job);
      return serializeWastage(
        job,
        calculation,
        getStatus(job, review),
        review?.reviewEvent ?? getReviewEvent(job),
        job.wastageAlerts[0],
      );
    })
    .filter((item) => {
      if (statusFilter === "pending") return item.alert?.status === "PENDING";
      if (statusFilter === "resolved") return item.alert?.status === "RESOLVED";
      return true;
    });
}

async function resolveAlert(prisma, alertId, resolvedById) {
  const alert = await prisma.wastageAlert.findUnique({ where: { id: alertId } });
  if (!alert) throw new WastageError(404, "Wastage alert not found");
  if (alert.status === "RESOLVED") return alert;
  return prisma.wastageAlert.update({
    where: { id: alertId },
    data: { status: "RESOLVED", resolvedById, resolvedAt: new Date() },
  });
}

module.exports = {
  WastageError,
  calculateWastage,
  createWastageReview,
  getJobWastage,
  listWastage,
  resolveAlert,
  submitForReview,
};
