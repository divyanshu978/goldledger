const request = require("supertest");
const { before, after, describe, it } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const { prisma, pool } = require("../src/lib/prisma");

const karigarCode = "ISSUE-TEST-001";
let karigar;
let openingJob;

async function login(email, password) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/login").send({ email, password });
  assert.equal(response.status, 200);
  return agent;
}

describe("gold issue API", () => {
  before(async () => {
    const existing = await prisma.karigar.findUnique({ where: { karigarCode } });
    if (existing) {
      await prisma.goldTransaction.deleteMany({ where: { karigarId: existing.id } });
      await prisma.wastageAlert.deleteMany({ where: { job: { karigarId: existing.id } } });
      await prisma.wastageReview.deleteMany({ where: { job: { karigarId: existing.id } } });
      await prisma.job.deleteMany({ where: { karigarId: existing.id } });
      await prisma.wastageRule.deleteMany({ where: { karigarId: existing.id } });
      await prisma.karigar.delete({ where: { id: existing.id } });
    }
    karigar = await prisma.karigar.create({
      data: {
        karigarCode,
        name: "Issue Test Karigar",
        phone: "9000000091",
      },
    });
    await prisma.wastageRule.create({
      data: {
        karigarId: karigar.id,
        itemCategory: "NECKLACE",
        allowedWastagePercent: "3.000",
      },
    });
    await prisma.wastageRule.create({
      data: {
        karigarId: karigar.id,
        itemCategory: "CHAIN",
        allowedWastagePercent: "2.000",
      },
    });
    openingJob = await prisma.job.create({
      data: {
        jobNumber: "ISSUE-TEST-STOCK",
        karigarId: karigar.id,
        itemCategory: "OPENING_STOCK",
        dueDate: new Date("2026-12-01T00:00:00.000Z"),
        notes: "Test-only opening stock",
      },
    });
    await prisma.goldTransaction.create({
      data: {
        transactionId: "ISSUE-TEST-RECEIPT",
        transactionType: "RECEIPT",
        jobId: openingJob.id,
        karigarId: karigar.id,
        grossWeight: "1000.000",
        purity: "100.00",
        fineWeight: "1000.000",
        createdById: (await prisma.user.findUnique({ where: { email: "finance@goldledger.demo" } })).id,
      },
    });
  });

  after(async () => {
    await prisma.goldTransaction.deleteMany({ where: { karigarId: karigar.id } });
    await prisma.wastageAlert.deleteMany({ where: { job: { karigarId: karigar.id } } });
    await prisma.wastageReview.deleteMany({ where: { job: { karigarId: karigar.id } } });
    await prisma.job.deleteMany({ where: { karigarId: karigar.id } });
    await prisma.wastageRule.deleteMany({ where: { karigarId: karigar.id } });
    await prisma.karigar.delete({ where: { id: karigar.id } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("creates an issue and calculates fine gold server-side", async () => {
    const agent = await login("clerk@goldledger.demo", "Demo123!");
    const response = await agent.post("/api/gold-issues").send({
      karigarId: karigar.id,
      grossWeight: "10.000",
      purity: "91.60",
      category: "NECKLACE",
      dueDate: "2026-12-15",
      notes: "Test issue",
      fineGoldWeight: "999999",
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.transaction.fineWeight, "9.160");
    assert.equal(response.body.job.category, "NECKLACE");
    assert.equal(response.body.transaction.transactionType, "ISSUE");
  });

  it("rejects an issue when vault stock is insufficient", async () => {
    const agent = await login("finance@goldledger.demo", "Demo123!");
    const response = await agent.post("/api/gold-issues").send({
      karigarId: karigar.id,
      grossWeight: "2000.000",
      purity: "100.00",
      category: "CHAIN",
      dueDate: "2026-12-15",
    });

    assert.equal(response.status, 409);
    assert.match(response.body.error, /Insufficient vault stock/);
  });

  it("rejects invalid input", async () => {
    const agent = await login("clerk@goldledger.demo", "Demo123!");
    const response = await agent.post("/api/gold-issues").send({
      karigarId: karigar.id,
      grossWeight: "0",
      purity: "101",
      category: "",
      dueDate: "not-a-date",
    });

    assert.equal(response.status, 400);
  });

  it("rejects unauthorized access", async () => {
    const response = await request(app).post("/api/gold-issues").send({});
    assert.equal(response.status, 401);
  });
});
