const { Prisma } = require("@prisma/client");

const OPENING_STOCK_JOB_NUMBER = "JOB-OPENING-STOCK";

function sum(transactions) {
  return transactions.reduce(
    (total, transaction) => total.add(transaction.fineWeight),
    new Prisma.Decimal(0),
  );
}

function formatDecimal(value) {
  return value.toFixed(3);
}

function getStockEvent(transaction) {
  if (transaction.transactionType === "ISSUE") return "ISSUE";
  if (transaction.returnType) {
    return transaction.returnReview?.status === "ACCEPTED"
      ? "ACCEPTED_RETURN"
      : "PENDING_RETURN";
  }
  return transaction.job.jobNumber === OPENING_STOCK_JOB_NUMBER
    ? "OPENING_STOCK"
    : "RECEIPT";
}

function serializeTransaction(transaction) {
  return {
    id: transaction.id,
    reference: transaction.transactionId,
    date: transaction.createdAt,
    transactionType: transaction.transactionType,
    stockEvent: getStockEvent(transaction),
    returnType: transaction.returnType,
    reviewStatus: transaction.returnReview?.status ?? null,
    fineGold: formatDecimal(transaction.fineWeight),
    grossWeight: formatDecimal(transaction.grossWeight),
    purity: transaction.purity.toFixed(2),
    notes: transaction.notes,
    job: {
      id: transaction.job.id,
      jobNumber: transaction.job.jobNumber,
      category: transaction.job.itemCategory,
    },
    karigar: {
      id: transaction.karigar.id,
      name: transaction.karigar.name,
      code: transaction.karigar.karigarCode,
    },
  };
}

async function getDashboard(prisma) {
  const [transactions, openJobs, pendingReviews, pendingAlerts] = await Promise.all([
    prisma.goldTransaction.findMany({
      include: {
        job: { select: { id: true, jobNumber: true, itemCategory: true } },
        karigar: { select: { id: true, name: true, karigarCode: true } },
        returnReview: { select: { status: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.job.count({
      where: { status: { in: ["OPEN", "PARTIALLY_RETURNED"] } },
    }),
    prisma.returnReview.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.wastageAlert.count({ where: { status: "PENDING" } }),
  ]);

  const opening = [];
  const received = [];
  const issued = [];
  const acceptedReturns = [];
  const allReturns = [];

  for (const transaction of transactions) {
    const event = getStockEvent(transaction);
    if (event === "OPENING_STOCK") opening.push(transaction);
    if (event === "RECEIPT") received.push(transaction);
    if (event === "ISSUE") issued.push(transaction);
    if (event === "ACCEPTED_RETURN") acceptedReturns.push(transaction);
    if (transaction.returnType) allReturns.push(transaction);
  }

  const openingStock = sum(opening);
  const receivedStock = sum(received);
  const issuedGold = sum(issued);
  const acceptedReturnGold = sum(acceptedReturns);
  const returnedGold = sum(allReturns);

  return {
    summary: {
      goldInVault: formatDecimal(
        openingStock.add(receivedStock).add(acceptedReturnGold).sub(issuedGold),
      ),
      goldWithKarigars: formatDecimal(issuedGold.sub(returnedGold)),
      openJobs,
      itemsNeedingReview: pendingReviews + pendingAlerts,
      pendingReturns: pendingReviews,
      pendingWastageAlerts: pendingAlerts,
    },
    transactions: transactions.slice(0, 10).map(serializeTransaction),
  };
}

module.exports = { getDashboard };
