const { z } = require("zod");

const { prisma } = require("../lib/prisma");
const {
  WastageError,
  getJobWastage,
  listWastage,
  resolveAlert,
  submitForReview,
} = require("../service/wastage.service");

const idSchema = z.string().uuid();
const filterSchema = z.enum(["all", "pending", "resolved"]).default("all");

function handleError(response, error, fallback) {
  if (error instanceof WastageError) {
    return response.status(error.statusCode).json({ error: error.message });
  }
  console.error(`${fallback}:`, error);
  return response.status(500).json({ error: fallback });
}

async function list(request, response) {
  const parsed = filterSchema.safeParse(request.query.status ?? "all");
  if (!parsed.success) return response.status(400).json({ error: "Invalid wastage alert status" });
  try {
    return response.status(200).json({ items: await listWastage(prisma, parsed.data) });
  } catch (error) {
    return handleError(response, error, "Unable to load wastage alerts");
  }
}

async function get(request, response) {
  const parsed = idSchema.safeParse(request.params.jobId);
  if (!parsed.success) return response.status(400).json({ error: "Invalid job id" });
  try {
    return response.status(200).json(await getJobWastage(prisma, parsed.data));
  } catch (error) {
    return handleError(response, error, "Unable to load job wastage");
  }
}

async function submit(request, response) {
  const parsed = idSchema.safeParse(request.params.jobId);
  if (!parsed.success) return response.status(400).json({ error: "Invalid job id" });
  try {
    return response.status(200).json(
      await submitForReview(prisma, parsed.data, request.user.id),
    );
  } catch (error) {
    return handleError(response, error, "Unable to submit wastage review");
  }
}

async function resolve(request, response) {
  const parsed = idSchema.safeParse(request.params.alertId);
  if (!parsed.success) return response.status(400).json({ error: "Invalid alert id" });
  try {
    return response.status(200).json({
      alert: await resolveAlert(prisma, parsed.data, request.user.id),
    });
  } catch (error) {
    return handleError(response, error, "Unable to resolve wastage alert");
  }
}

module.exports = { get, list, resolve, submit };
