const request = require("supertest");
const { before, after, describe, it } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const { prisma, pool } = require("../src/lib/prisma");

let karigar;
let finance;
let clerk;

async function login(email) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/login").send({
    email,
    password: "Demo123!",
  });
  assert.equal(response.status, 200);
  return agent;
}

async function createPendingReturn(suffix) {
  const job = await prisma.job.create({
    data: {
      jobNumber: `REVIEW-TEST-${suffix}`,
      karigarId: karigar.id,
      itemCategory: "RING",
      dueDate: new Date("2026-12-20T00:00:00.000Z"),
      appliedWastagePercent: "2.000",
    },
  });
  await prisma.goldTransaction.create({
    data: {
      transactionId: `REVIEW-ISSUE-${suffix}`,
      transactionType: "ISSUE",
      jobId: job.id,
      karigarId: karigar.id,
      grossWeight: "10.000",
      purity: "100.00",
      fineWeight: "10.000",
      createdById: clerk.id,
    },
  });
  const clerkAgent = await login("clerk@goldledger.demo");
  const response = await clerkAgent.post("/api/gold-returns").send({
    jobId: job.id,
    returnType: "SCRAP",
    grossWeight: "9.000",
    purity: "100.00",
  });
  assert.equal(response.status, 201);
  return response.body.transaction.id;
}

describe("return finance review API", () => {
  before(async () => {
    finance = await prisma.user.findUnique({ where: { email: "finance@goldledger.demo" } });
    clerk = await prisma.user.findUnique({ where: { email: "clerk@goldledger.demo" } });
    const existing = await prisma.karigar.findUnique({ where: { karigarCode: "REVIEW-TEST-001" } });
    if (existing) {
      await prisma.returnReview.deleteMany({ where: { transaction: { karigarId: existing.id } } });
      await prisma.goldTransaction.deleteMany({ where: { karigarId: existing.id } });
      await prisma.wastageAlert.deleteMany({ where: { job: { karigarId: existing.id } } });
      await prisma.wastageReview.deleteMany({ where: { job: { karigarId: existing.id } } });
      await prisma.job.deleteMany({ where: { karigarId: existing.id } });
      await prisma.karigar.delete({ where: { id: existing.id } });
    }
    karigar = await prisma.karigar.create({
      data: {
        karigarCode: "REVIEW-TEST-001",
        name: "Review Test Karigar",
        phone: "9000000095",
      },
    });
  });

  after(async () => {
    await prisma.returnReview.deleteMany({ where: { transaction: { karigarId: karigar.id } } });
    await prisma.goldTransaction.deleteMany({ where: { karigarId: karigar.id } });
    await prisma.wastageAlert.deleteMany({ where: { job: { karigarId: karigar.id } } });
    await prisma.wastageReview.deleteMany({ where: { job: { karigarId: karigar.id } } });
    await prisma.job.deleteMany({ where: { karigarId: karigar.id } });
    await prisma.karigar.delete({ where: { id: karigar.id } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("allows finance to accept a return and records the reviewer", async () => {
    const transactionId = await createPendingReturn("ACCEPT");
    const financeAgent = await login("finance@goldledger.demo");
    const response = await financeAgent.patch(`/api/finance-reviews/${transactionId}`).send({
      decision: "ACCEPTED",
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.review.status, "ACCEPTED");
    assert.equal(response.body.review.reviewerId, finance.id);
    assert.ok(response.body.review.reviewedAt);

    const review = await prisma.returnReview.findUnique({ where: { transactionId } });
    assert.equal(review.status, "ACCEPTED");
  });

  it("requires a reason and records rejection", async () => {
    const transactionId = await createPendingReturn("REJECT");
    const financeAgent = await login("finance@goldledger.demo");
    const missingReason = await financeAgent.patch(`/api/finance-reviews/${transactionId}`).send({
      decision: "REJECTED",
    });
    assert.equal(missingReason.status, 400);

    const response = await financeAgent.patch(`/api/finance-reviews/${transactionId}`).send({
      decision: "REJECTED",
      rejectionReason: "Purity certificate is missing",
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.review.status, "REJECTED");
    assert.equal(response.body.review.rejectionReason, "Purity certificate is missing");
  });

  it("prevents duplicate review decisions", async () => {
    const transactionId = await createPendingReturn("DUPLICATE");
    const financeAgent = await login("finance@goldledger.demo");
    assert.equal((await financeAgent.patch(`/api/finance-reviews/${transactionId}`).send({ decision: "ACCEPTED" })).status, 200);
    const duplicate = await financeAgent.patch(`/api/finance-reviews/${transactionId}`).send({ decision: "REJECTED", rejectionReason: "Too late" });
    assert.equal(duplicate.status, 409);
  });

  it("blocks an issue clerk from approving a return", async () => {
    const transactionId = await createPendingReturn("CLERK");
    const clerkAgent = await login("clerk@goldledger.demo");
    const response = await clerkAgent.patch(`/api/finance-reviews/${transactionId}`).send({ decision: "ACCEPTED" });
    assert.equal(response.status, 403);
  });
});
