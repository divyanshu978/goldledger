const { prisma } = require("../lib/prisma");
const { getDashboard } = require("../service/dashboard.service");

async function get(request, response) {
  try {
    return response.status(200).json(await getDashboard(prisma));
  } catch (error) {
    console.error("Dashboard request failed:", error);
    return response.status(500).json({ error: "Unable to load dashboard" });
  }
}

module.exports = { get };
