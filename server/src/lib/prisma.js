const { Pool, neonConfig } = require("@neondatabase/serverless");
const { PrismaNeon } = require("@prisma/adapter-neon");
const { PrismaClient } = require("@prisma/client");
const ws = require("ws");
const env = require("../config/env");

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to initialize Prisma");
}

// Enable WebSocket support for Neon serverless pool
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

module.exports = { prisma, pool };