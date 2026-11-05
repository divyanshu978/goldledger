const { z } = require("zod");

const { prisma } = require("../lib/prisma");
const { GoldIssueError, issueGold } = require("../service/gold-issue.service");

const issueSchema = z.object({
  karigarId: z.string().uuid(),
  grossWeight: z.string().trim().min(1),
  purity: z.string().trim().min(1),
  category: z.string().trim().min(1).max(80),
  dueDate: z.string().date(),
  notes: z.string().trim().max(500).optional(),
});

async function create(request, response) {
  const parsed = issueSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({
      error: "Invalid gold issue request",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const result = await issueGold(prisma, {
      ...parsed.data,
      dueDate: new Date(`${parsed.data.dueDate}T00:00:00.000Z`),
      createdById: request.user.id,
    });
    return response.status(201).json(result);
  } catch (error) {
    if (error instanceof GoldIssueError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof RangeError || error instanceof TypeError) {
      return response.status(400).json({ error: error.message });
    }
    console.error("Gold issue request failed:", error);
    return response.status(500).json({ error: "Unable to issue gold" });
  }
}

module.exports = { create };
