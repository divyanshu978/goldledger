const { prisma } = require("../lib/prisma");
const { getStockStatement } = require("../service/stock-statement.service");

async function get(request, response) {
  try {
    return response.status(200).json(await getStockStatement(prisma));
  } catch (error) {
    console.error("Stock statement request failed:", error);
    return response.status(500).json({ error: "Unable to load stock statement" });
  }
}

module.exports = { get };
