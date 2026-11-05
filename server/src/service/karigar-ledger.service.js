const { Prisma } = require("@prisma/client");

function sumFineWeight(transactions, transactionType) {
  return transactions
    .filter((transaction) => transaction.transactionType === transactionType)
    .reduce(
      (total, transaction) => total.add(transaction.fineWeight),
      new Prisma.Decimal(0),
    );
}

function serializeTransaction(transaction) {
  return {
    id: transaction.id,
    transactionId: transaction.transactionId,
    date: transaction.createdAt,
    type: transaction.transactionType,
    returnType: transaction.returnType,
    grossWeight: transaction.grossWeight.toFixed(3),
    purity: transaction.purity.toFixed(2),
    fineGold: transaction.fineWeight.toFixed(3),
    notes: transaction.notes,
    job: {
      id: transaction.job.id,
      jobNumber: transaction.job.jobNumber,
      category: transaction.job.itemCategory,
    },
  };
}

async function getKarigarLedger(prisma, karigarId) {
  const karigar = await prisma.karigar.findUnique({
    where: { id: karigarId },
    select: {
      id: true,
      karigarCode: true,
      name: true,
      phone: true,
      isActive: true,
      goldTransactions: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          job: {
            select: { id: true, jobNumber: true, itemCategory: true },
          },
        },
      },
    },
  });

  if (!karigar) return null;

  const issued = sumFineWeight(karigar.goldTransactions, "ISSUE");
  const returned = sumFineWeight(karigar.goldTransactions, "RECEIPT");

  return {
    karigar: {
      id: karigar.id,
      karigarCode: karigar.karigarCode,
      name: karigar.name,
      phone: karigar.phone,
      isActive: karigar.isActive,
    },
    summary: {
      totalFineGoldIssued: issued.toFixed(3),
      totalFineGoldReturned: returned.toFixed(3),
      outstandingFineGold: issued.sub(returned).toFixed(3),
    },
    transactions: karigar.goldTransactions.map(serializeTransaction),
  };
}

module.exports = {
  getKarigarLedger,
  sumFineWeight,
};
