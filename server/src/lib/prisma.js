const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");

const env = require("../config/env");

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to initialize Prisma");
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

module.exports = { prisma, pool };
