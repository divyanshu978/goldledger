const bcrypt = require("bcrypt");
const express = require("express");
const request = require("supertest");
const { before, after, beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const { prisma, pool } = require("../src/lib/prisma");
const { requireAuth, requireRole } = require("../src/middleware/auth.middleware");
const authRouter = require("../src/routes/auth.routes");

const testUsers = {
  clerk: {
    name: "Auth Test Clerk",
    email: "auth-clerk@goldledger.test",
    password: "ClerkPassword123!",
    role: "ISSUE_CLERK",
  },
  finance: {
    name: "Auth Test Finance",
    email: "auth-finance@goldledger.test",
    password: "FinancePassword123!",
    role: "FINANCE_HEAD",
  },
};

const roleTestApp = express();
roleTestApp.use(express.json());
roleTestApp.use("/api/auth", authRouter);
roleTestApp.get(
  "/finance-only",
  requireAuth,
  requireRole("FINANCE_HEAD"),
  (_request, response) => response.status(200).json({ status: "ok" }),
);

async function createTestUser(user) {
  return prisma.user.upsert({
    where: { email: user.email },
    update: {
      passwordHash: await bcrypt.hash(user.password, 4),
      isActive: true,
      role: user.role,
    },
    create: {
      name: user.name,
      email: user.email,
      passwordHash: await bcrypt.hash(user.password, 4),
      role: user.role,
    },
  });
}

describe("authentication", () => {
  let clerk;
  let finance;

  before(async () => {
    clerk = await createTestUser(testUsers.clerk);
    finance = await createTestUser(testUsers.finance);
  });

  beforeEach(async () => {
    await prisma.user.updateMany({
      where: { id: { in: [clerk.id, finance.id] } },
      data: { isActive: true },
    });
  });

  after(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [clerk.id, finance.id] } },
    });
    await prisma.$disconnect();
    await pool.end();
  });

  it("logs in and sets an HttpOnly cookie without exposing the password hash", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUsers.clerk.email,
        password: testUsers.clerk.password,
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.email, testUsers.clerk.email);
    assert.equal(response.body.user.role, "ISSUE_CLERK");
    assert.equal("passwordHash" in response.body.user, false);
    assert.match(response.headers["set-cookie"][0], /goldledger_token=/);
    assert.match(response.headers["set-cookie"][0], /HttpOnly/i);
  });

  it("rejects an invalid password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUsers.clerk.email,
        password: "wrong-password",
      });

    assert.equal(response.status, 401);
  });

  it("rejects unauthenticated profile requests", async () => {
    const response = await request(app).get("/api/auth/me");

    assert.equal(response.status, 401);
  });

  it("rejects a user with the incorrect role", async () => {
    const agent = request.agent(roleTestApp);
    await agent.post("/api/auth/login").send({
      email: testUsers.clerk.email,
      password: testUsers.clerk.password,
    });

    const response = await agent.get("/finance-only");

    assert.equal(response.status, 403);
  });

  it("rejects inactive accounts", async () => {
    await prisma.user.update({
      where: { id: clerk.id },
      data: { isActive: false },
    });

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUsers.clerk.email,
        password: testUsers.clerk.password,
      });

    assert.equal(response.status, 401);
  });
});
