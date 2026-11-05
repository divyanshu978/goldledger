const request = require("supertest");
const { before, after, describe, it } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const { prisma, pool } = require("../src/lib/prisma");

let karigar;
let job;

async function login() {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/login").send({
    email: "clerk@goldledger.demo",
    password: "Demo123!",
  });
  assert.equal(response.status, 200);
  return agent;
}

describe("karigar ledger API", () => {
  before(async () => {
    const user = await prisma.user.findUnique({
      where: { email: "clerk@goldledger.demo" },
    });
    karigar = await prisma.karigar.create({
      data: {
        karigarCode: "LEDGER-TEST-001",
        name: "Ledger Test Karigar",
        phone: "9000000093",
      },
    });
    job = await prisma.job.create({
      data: {
        jobNumber: "LEDGER-TEST-001",
        karigarId: karigar.id,
        itemCategory: "RING",
        dueDate: new Date("2026-12-30T00:00:00.000Z"),
        notes: "Ledger test job",
      },
    });
    await prisma.goldTransaction.createMany({
      data: [
        {
          transactionId: "LEDGER-TEST-ISSUE",
          transactionType: "ISSUE",
          jobId: job.id,
          karigarId: karigar.id,
          grossWeight: "10.000",
          purity: "91.60",
          fineWeight: "9.160",
          createdById: user.id,
          notes: "Issue note",
          createdAt: new Date("2026-11-05T10:00:00.000Z"),
        },
        {
          transactionId: "LEDGER-TEST-RETURN",
          transactionType: "RECEIPT",
          returnType: "SCRAP",
          jobId: job.id,
          karigarId: karigar.id,
          grossWeight: "4.000",
          purity: "91.60",
          fineWeight: "3.664",
          createdById: user.id,
          notes: "Return note",
          createdAt: new Date("2026-11-05T11:00:00.000Z"),
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

  it("returns exact ledger totals and descending transaction history", async () => {
    const agent = await login();
    const response = await agent.get(`/api/karigars/${karigar.id}/ledger`);

    assert.equal(response.status, 200);
    assert.equal(response.body.summary.totalFineGoldIssued, "9.160");
    assert.equal(response.body.summary.totalFineGoldReturned, "3.664");
    assert.equal(response.body.summary.outstandingFineGold, "5.496");
    assert.equal(response.body.transactions.length, 2);
    assert.equal(response.body.transactions[0].job.category, "RING");
    assert.equal(response.body.transactions[0].notes, "Return note");
    assert.ok(
      new Date(response.body.transactions[0].date) >=
        new Date(response.body.transactions[1].date),
    );
  });

  it("rejects unauthorized ledger access", async () => {
    const response = await request(app).get(`/api/karigars/${karigar.id}/ledger`);
    assert.equal(response.status, 401);
  });

  it("returns a not-found error for an invalid karigar", async () => {
    const agent = await login();
    const response = await agent.get(
      "/api/karigars/00000000-0000-0000-0000-000000000000/ledger",
    );
    assert.equal(response.status, 404);
  });
});
