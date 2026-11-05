const { z } = require("zod");

const { prisma } = require("../lib/prisma");
const {
  GoldReturnError,
  listOutstandingJobs,
  returnGold,
} = require("../service/gold-return.service");

const returnSchema = z.object({
  jobId: z.string().uuid(),
  returnType: z.enum(["FINISHED_JEWELLERY", "SCRAP", "FILINGS"]),
  grossWeight: z.string().trim().min(1),
  purity: z.string().trim().min(1),
  notes: z.string().trim().max(500).optional(),
});

async function listJobs(request, response) {
  try {
    return response.status(200).json({ jobs: await listOutstandingJobs(prisma) });
  } catch (error) {
    console.error("Outstanding jobs request failed:", error);
    return response.status(500).json({ error: "Unable to load outstanding jobs" });
  }
}

async function create(request, response) {
  const parsed = returnSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({
      error: "Invalid gold return request",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const result = await returnGold(prisma, {
      ...parsed.data,
      createdById: request.user.id,
    });
    return response.status(201).json(result);
  } catch (error) {
    if (error instanceof GoldReturnError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof RangeError || error instanceof TypeError) {
      return response.status(400).json({ error: error.message });
    }
    console.error("Gold return request failed:", error);
    return response.status(500).json({ error: "Unable to record gold return" });
  }
}

module.exports = { create, listJobs };
