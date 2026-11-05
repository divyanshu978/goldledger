const { z } = require("zod");

const { prisma } = require("../lib/prisma");
const { getKarigarLedger } = require("../service/karigar-ledger.service");

const idSchema = z.string().uuid();

async function get(request, response) {
  const parsed = idSchema.safeParse(request.params.id);
  if (!parsed.success) {
    return response.status(400).json({ error: "Invalid karigar id" });
  }

  try {
    const ledger = await getKarigarLedger(prisma, parsed.data);
    return ledger
      ? response.status(200).json(ledger)
      : response.status(404).json({ error: "Karigar not found" });
  } catch (error) {
    console.error("Karigar ledger request failed:", error);
    return response.status(500).json({ error: "Unable to load karigar ledger" });
  }
}

module.exports = { get };
