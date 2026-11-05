const bcrypt = require("bcrypt");
const request = require("supertest");
const { before, after, describe, it } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const { prisma, pool } = require("../src/lib/prisma");

const testUser = {
  name: "Karigar API Clerk",
  email: "karigar-api@goldledger.test",
  password: "KarigarApiPassword123!",
  role: "ISSUE_CLERK",
};

const testCodes = ["API-KAR-001", "API-KAR-002"];

async function login() {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/login").send({
    email: testUser.email,
    password: testUser.password,
  });
  assert.equal(response.status, 200);
  return agent;
}

async function removeTestKarigars() {
  const karigars = await prisma.karigar.findMany({
    where: { karigarCode: { in: testCodes } },
    select: { id: true },
  });
  const ids = karigars.map((karigar) => karigar.id);
  await prisma.wastageRule.deleteMany({ where: { karigarId: { in: ids } } });
  await prisma.karigar.deleteMany({ where: { id: { in: ids } } });
}

describe("karigar master API", () => {
  before(async () => {
    await prisma.user.upsert({
      where: { email: testUser.email },
      update: {
        passwordHash: await bcrypt.hash(testUser.password, 4),
        isActive: true,
        role: testUser.role,
      },
      create: {
        name: testUser.name,
        email: testUser.email,
        passwordHash: await bcrypt.hash(testUser.password, 4),
        role: testUser.role,
      },
    });
    await removeTestKarigars();
  });

  after(async () => {
    await removeTestKarigars();
    await prisma.user.delete({ where: { email: testUser.email } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("creates a karigar with wastage rules", async () => {
    const agent = await login();
    const response = await agent.post("/api/karigars").send({
      karigarCode: testCodes[0],
      name: "API Test Karigar",
      phone: "9000000011",
      wastageRules: [
        { itemCategory: "NECKLACE", allowedWastagePercent: 3 },
        { itemCategory: "RING", allowedWastagePercent: 1.25 },
      ],
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.karigar.karigarCode, testCodes[0]);
    assert.equal(response.body.karigar.wastageRules.length, 2);
    assert.equal(response.body.karigar.wastageRules[1].allowedWastagePercent, "1.25");
  });

  it("rejects a duplicate karigar code", async () => {
    const agent = await login();
    const response = await agent.post("/api/karigars").send({
      karigarCode: testCodes[0],
      name: "Duplicate Karigar",
      phone: "9000000012",
      wastageRules: [{ itemCategory: "CHAIN", allowedWastagePercent: 2 }],
    });

    assert.equal(response.status, 409);
  });

  it("rejects an invalid wastage percentage", async () => {
    const agent = await login();
    const response = await agent.post("/api/karigars").send({
      karigarCode: testCodes[1],
      name: "Invalid Karigar",
      phone: "9000000013",
      wastageRules: [{ itemCategory: "CHAIN", allowedWastagePercent: 101 }],
    });

    assert.equal(response.status, 400);
  });

  it("updates karigar details and wastage rules", async () => {
    const agent = await login();
    const current = await prisma.karigar.findUnique({ where: { karigarCode: testCodes[0] } });
    const response = await agent.patch(`/api/karigars/${current.id}`).send({
      name: "Updated API Karigar",
      wastageRules: [{ itemCategory: "BANGLE", allowedWastagePercent: 2.5 }],
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.karigar.name, "Updated API Karigar");
    assert.deepEqual(response.body.karigar.wastageRules.map((rule) => rule.itemCategory), ["BANGLE"]);
  });

  it("lists and searches karigars", async () => {
    const agent = await login();
    const response = await agent.get("/api/karigars").query({ search: "Updated API", page: 1, pageSize: 10 });

    assert.equal(response.status, 200);
    assert.equal(response.body.pagination.total, 1);
    assert.equal(response.body.items[0].karigarCode, testCodes[0]);
  });
});
