const { Prisma } = require("@prisma/client");

const OPENING_STOCK_JOB_NUMBER = "JOB-OPENING-STOCK";

function sumFineWeight(transactions) {
  return transactions.reduce(
    (total, transaction) => total.add(transaction.fineWeight),
    new Prisma.Decimal(0),
  );
}

function classifyTransaction(transaction) {
  if (transaction.transactionType === "ISSUE") return "ISSUE";
  if (transaction.returnType) {
    return transaction.returnReview?.status === "ACCEPTED"
      ? "ACCEPTED_RETURN"
      : "PENDING_RETURN";
  }
  if (transaction.job.jobNumber === OPENING_STOCK_JOB_NUMBER) return "OPENING_STOCK";
  return "RECEIPT";
}

function serializeTransaction(transaction) {
  return {
    id: transaction.id,
    reference: transaction.transactionId,
    date: transaction.createdAt,
    transactionType: transaction.transactionType,
    stockEvent: classifyTransaction(transaction),
    returnType: transaction.returnType,
    reviewStatus: transaction.returnReview?.status ?? null,
    grossWeight: transaction.grossWeight.toFixed(3),
    purity: transaction.purity.toFixed(2),
    fineGoldWeight: transaction.fineWeight.toFixed(3),
    notes: transaction.notes,
    job: {
      id: transaction.job.id,
      jobNumber: transaction.job.jobNumber,
      category: transaction.job.itemCategory,
    },
  };
}

async function getStockStatement(prisma) {
  const transactions = await prisma.goldTransaction.findMany({
    include: {
      job: {
        select: { id: true, jobNumber: true, itemCategory: true },
      },
      returnReview: { select: { status: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const openingStock = [];
  const receivedStock = [];
  const issuedGold = [];
  const acceptedReturns = [];

  for (const transaction of transactions) {
    const event = classifyTransaction(transaction);
    if (event === "OPENING_STOCK") openingStock.push(transaction);
    if (event === "RECEIPT") receivedStock.push(transaction);
    if (event === "ISSUE") issuedGold.push(transaction);
    if (event === "ACCEPTED_RETURN") acceptedReturns.push(transaction);
  }

  const opening = sumFineWeight(openingStock);
  const received = sumFineWeight(receivedStock);
  const issued = sumFineWeight(issuedGold);
  const returned = sumFineWeight(acceptedReturns);
  const adjustments = new Prisma.Decimal(0);
  const closing = opening.add(received).add(returned).add(adjustments).sub(issued);
  const outstanding = issued.sub(returned);

  return {
    summary: {
      openingStock: opening.toFixed(3),
      receivedStock: received.toFixed(3),
      issuedGold: issued.toFixed(3),
      acceptedReturns: returned.toFixed(3),
      adjustments: adjustments.toFixed(3),
      closingStock: closing.toFixed(3),
      outstandingWithKarigars: outstanding.toFixed(3),
    },
    transactions: transactions.map(serializeTransaction),
  };
}

module.exports = {
  OPENING_STOCK_JOB_NUMBER,
  classifyTransaction,
  getStockStatement,
};
