const request = require("supertest");
const { before, after, describe, it } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const { prisma, pool } = require("../src/lib/prisma");

let karigar;
const jobs = [];

async function login() {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/login").send({
    email: "clerk@goldledger.demo",
    password: "Demo123!",
  });
  assert.equal(response.status, 200);
  return agent;
}

async function createIssueJob(jobNumber, fineWeight) {
  const job = await prisma.job.create({
    data: {
      jobNumber,
      karigarId: karigar.id,
      itemCategory: "NECKLACE",
      dueDate: new Date("2026-12-20T00:00:00.000Z"),
      notes: "Return test job",
    },
  });
  await prisma.goldTransaction.create({
    data: {
      transactionId: `RETURN-TEST-ISSUE-${jobNumber}`,
      transactionType: "ISSUE",
      jobId: job.id,
      karigarId: karigar.id,
      grossWeight: fineWeight,
      purity: "100.00",
      fineWeight,
      createdById: (await prisma.user.findUnique({ where: { email: "clerk@goldledger.demo" } })).id,
    },
  });
  jobs.push(job);
  return job;
}

describe("gold return API", () => {
  before(async () => {
    karigar = await prisma.karigar.create({
      data: {
        karigarCode: "RETURN-TEST-001",
        name: "Return Test Karigar",
        phone: "9000000092",
      },
    });
  });

  after(async () => {
    await prisma.goldTransaction.deleteMany({ where: { karigarId: karigar.id } });
    await prisma.job.deleteMany({ where: { karigarId: karigar.id } });
    await prisma.karigar.delete({ where: { id: karigar.id } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("records a partial return and updates the job status", async () => {
    const job = await createIssueJob("RETURN-TEST-PARTIAL", "10.000");
    const agent = await login();
    const response = await agent.post("/api/gold-returns").send({
      jobId: job.id,
      returnType: "SCRAP",
      grossWeight: "4.000",
      purity: "100.00",
      notes: "Partial scrap return",
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.transaction.fineWeight, "4.000");
    assert.equal(response.body.job.status, "PARTIALLY_RETURNED");
    assert.equal(response.body.job.outstandingFineGold, "6.000");
  });

  it("records a full return and completes the job", async () => {
    const job = await createIssueJob("RETURN-TEST-FULL", "10.000");
    const agent = await login();
    const response = await agent.post("/api/gold-returns").send({
      jobId: job.id,
      returnType: "FINISHED_JEWELLERY",
      grossWeight: "10.000",
      purity: "100.00",
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.job.status, "COMPLETED");
    assert.equal(response.body.job.outstandingFineGold, "0.000");
  });

  it("rejects a return that exceeds the outstanding balance", async () => {
    const job = await createIssueJob("RETURN-TEST-EXCESS", "10.000");
    const agent = await login();
    const response = await agent.post("/api/gold-returns").send({
      jobId: job.id,
      returnType: "FILINGS",
      grossWeight: "10.001",
      purity: "100.00",
    });

    assert.equal(response.status, 409);
    assert.match(response.body.error, /exceeds the outstanding/i);
  });

  it("rejects an invalid job", async () => {
    const agent = await login();
    const response = await agent.post("/api/gold-returns").send({
      jobId: "00000000-0000-0000-0000-000000000000",
      returnType: "SCRAP",
      grossWeight: "1.000",
      purity: "100.00",
    });

    assert.equal(response.status, 404);
  });
});
