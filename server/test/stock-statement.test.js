const request = require("supertest");
const { Prisma } = require("@prisma/client");
const { before, after, describe, it } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const { prisma, pool } = require("../src/lib/prisma");

let karigar;
let job;
let user;

async function login(email, password) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/login").send({ email, password });
  assert.equal(response.status, 200);
  return agent;
}

describe("stock statement API", () => {
  before(async () => {
    user = await prisma.user.findUnique({
      where: { email: "finance@goldledger.demo" },
    });
    karigar = await prisma.karigar.create({
      data: {
        karigarCode: "STOCK-TEST-001",
        name: "Stock Test Karigar",
        phone: "9000000094",
      },
    });
    job = await prisma.job.create({
      data: {
        jobNumber: "STOCK-TEST-JOB",
        karigarId: karigar.id,
        itemCategory: "CHAIN",
        dueDate: new Date("2026-12-30T00:00:00.000Z"),
      },
    });
    const openingJob = await prisma.job.findUnique({
      where: { jobNumber: "JOB-OPENING-STOCK" },
    });
    await prisma.goldTransaction.createMany({
      data: [
        {
          transactionId: "STOCK-TEST-OPENING",
          transactionType: "RECEIPT",
          jobId: openingJob.id,
          karigarId: karigar.id,
          grossWeight: "100.000",
          purity: "100.00",
          fineWeight: "100.000",
          createdById: user.id,
          createdAt: new Date("2026-11-01T09:00:00.000Z"),
        },
        {
          transactionId: "STOCK-TEST-RECEIPT",
          transactionType: "RECEIPT",
          jobId: job.id,
          karigarId: karigar.id,
          grossWeight: "20.000",
          purity: "100.00",
          fineWeight: "20.000",
          createdById: user.id,
          createdAt: new Date("2026-11-02T09:00:00.000Z"),
        },
        {
          transactionId: "STOCK-TEST-ISSUE",
          transactionType: "ISSUE",
          jobId: job.id,
          karigarId: karigar.id,
          grossWeight: "30.000",
          purity: "100.00",
          fineWeight: "30.000",
          createdById: user.id,
          createdAt: new Date("2026-11-03T09:00:00.000Z"),
        },
        {
          transactionId: "STOCK-TEST-RETURN",
          transactionType: "RECEIPT",
          returnType: "SCRAP",
          jobId: job.id,
          karigarId: karigar.id,
          grossWeight: "10.000",
          purity: "100.00",
          fineWeight: "10.000",
          createdById: user.id,
          createdAt: new Date("2026-11-04T09:00:00.000Z"),
        },
      ],
    });
  });

  after(async () => {
    await prisma.goldTransaction.deleteMany({ where: { karigarId: karigar.id } });
    await prisma.job.delete({ where: { id: job.id } });
    await prisma.karigar.delete({ where: { id: karigar.id } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("calculates opening, receipt, issue, accepted return, and closing stock", async () => {
    const agent = await login("finance@goldledger.demo", "Demo123!");
    const response = await agent.get("/api/stock-statement");

    assert.equal(response.status, 200);
    assert.equal(response.body.summary.adjustments, "0.000");
    const summary = response.body.summary;
    const expectedClosing = new Prisma.Decimal(summary.openingStock)
      .add(summary.receivedStock)
      .add(summary.acceptedReturns)
      .sub(summary.issuedGold)
      .toFixed(3);
    const expectedOutstanding = new Prisma.Decimal(summary.issuedGold)
      .sub(summary.acceptedReturns)
      .toFixed(3);
    assert.equal(summary.closingStock, expectedClosing);
    assert.equal(summary.outstandingWithKarigars, expectedOutstanding);
    assert.ok(
      response.body.transactions.some(
        (transaction) => transaction.reference === "STOCK-TEST-RETURN",
      ),
    );
  });

  it("blocks issue clerk access", async () => {
    const agent = await login("clerk@goldledger.demo", "Demo123!");
    const response = await agent.get("/api/stock-statement");
    assert.equal(response.status, 403);
  });

  it("blocks unauthenticated access", async () => {
    const response = await request(app).get("/api/stock-statement");
    assert.equal(response.status, 401);
  });
});
