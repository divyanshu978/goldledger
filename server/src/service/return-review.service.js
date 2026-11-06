const { Prisma } = require("@prisma/client");

class ReturnReviewError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function serializeReview(review) {
  return {
    id: review.id,
    status: review.status,
    reviewerId: review.reviewerId,
    reviewedAt: review.reviewedAt,
    rejectionReason: review.rejectionReason,
    transaction: {
      id: review.transaction.id,
      transactionId: review.transaction.transactionId,
      returnType: review.transaction.returnType,
      grossWeight: review.transaction.grossWeight.toFixed(3),
      purity: review.transaction.purity.toFixed(2),
      fineGold: review.transaction.fineWeight.toFixed(3),
      notes: review.transaction.notes,
      createdAt: review.transaction.createdAt,
    },
    job: {
      id: review.transaction.job.id,
      jobNumber: review.transaction.job.jobNumber,
      category: review.transaction.job.itemCategory,
      karigar: {
        id: review.transaction.job.karigar.id,
        code: review.transaction.job.karigar.karigarCode,
        name: review.transaction.job.karigar.name,
      },
    },
  };
}

const reviewInclude = {
  transaction: {
    include: {
      job: {
        include: {
          karigar: { select: { id: true, karigarCode: true, name: true } },
          transactions: {
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
        },
      },
    },
  },
};

async function listPendingReturns(prisma) {
  const reviews = await prisma.returnReview.findMany({
    where: { status: "PENDING_REVIEW" },
    include: reviewInclude,
    orderBy: { createdAt: "desc" },
  });
  return reviews.map((review) => ({
    ...serializeReview(review),
    transactions: review.transaction.job.transactions.map((transaction) => ({
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
  }));
}

async function decideReturn(prisma, transactionId, reviewerId, decision, rejectionReason) {
  const executeDecision = () => prisma.$transaction(async (transaction) => {
    const review = await transaction.returnReview.findUnique({
      where: { transactionId },
      include: reviewInclude,
    });
    if (!review) throw new ReturnReviewError(404, "Return review not found");
    if (review.status !== "PENDING_REVIEW") {
      throw new ReturnReviewError(409, "This return has already been reviewed");
    }

    const updated = await transaction.returnReview.updateMany({
      where: { id: review.id, status: "PENDING_REVIEW" },
      data: {
        status: decision,
        reviewerId,
        reviewedAt: new Date(),
        rejectionReason: decision === "REJECTED" ? rejectionReason : null,
      },
    });
    if (updated.count !== 1) {
      throw new ReturnReviewError(409, "This return has already been reviewed");
    }

    await transaction.auditLog.create({
      data: {
        userId: reviewerId,
        action: `RETURN_${decision}`,
        entityType: "GoldTransaction",
        entityId: review.transaction.transactionId,
      },
    });

    const finalReview = await transaction.returnReview.findUnique({
      where: { id: review.id },
      include: reviewInclude,
    });
    return serializeReview(finalReview);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await executeDecision();
    } catch (error) {
      const retryable = error.code === "P2034" || error.cause?.originalCode === "40001";
      if (!retryable || attempt === 2) throw error;
    }
  }
}

module.exports = {
  ReturnReviewError,
  decideReturn,
  listPendingReturns,
};
