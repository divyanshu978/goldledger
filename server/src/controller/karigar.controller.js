const { z } = require("zod");

const { prisma } = require("../lib/prisma");
const {
  createKarigar,
  getKarigar,
  isUniqueConstraintError,
  listKarigars,
  updateKarigar,
  updateKarigarStatus,
} = require("../service/karigar.service");

const wastageRuleSchema = z.object({
  itemCategory: z.string().trim().min(1).max(80),
  allowedWastagePercent: z.coerce.number().min(0).max(100),
});

const createKarigarSchema = z.object({
  karigarCode: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(30),
  wastageRules: z.array(wastageRuleSchema).min(1).superRefine((rules, context) => {
    const categories = new Set();
    rules.forEach((rule, index) => {
      if (categories.has(rule.itemCategory.toUpperCase())) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "itemCategory"],
          message: "Duplicate item category",
        });
      }
      categories.add(rule.itemCategory.toUpperCase());
    });
  }),
});

const updateKarigarSchema = createKarigarSchema.partial().extend({
  wastageRules: z.array(wastageRuleSchema).min(1).superRefine((rules, context) => {
    const categories = new Set();
    rules.forEach((rule, index) => {
      if (categories.has(rule.itemCategory.toUpperCase())) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "itemCategory"],
          message: "Duplicate item category",
        });
      }
      categories.add(rule.itemCategory.toUpperCase());
    });
  }).optional(),
});

const idSchema = z.string().uuid();
const statusSchema = z.object({ isActive: z.boolean() });

function sendValidationError(response, parsed) {
  return response.status(400).json({
    error: "Invalid karigar request",
    details: parsed.error.flatten().fieldErrors,
  });
}

function handleServiceError(response, error) {
  if (error.statusCode) {
    return response.status(error.statusCode).json({ error: error.publicMessage });
  }
  if (error.code === "P2025") {
    return response.status(404).json({ error: "Karigar not found" });
  }
  if (isUniqueConstraintError(error)) {
    return response.status(409).json({ error: "Karigar code or wastage rule already exists" });
  }
  console.error("Karigar request failed:", error);
  return response.status(500).json({ error: "Unable to process karigar request" });
}

async function create(request, response) {
  const parsed = createKarigarSchema.safeParse(request.body);
  if (!parsed.success) return sendValidationError(response, parsed);

  try {
    return response.status(201).json({ karigar: await createKarigar(prisma, parsed.data) });
  } catch (error) {
    return handleServiceError(response, error);
  }
}

async function list(request, response) {
  const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(120).optional(),
    isActive: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  });
  const parsed = querySchema.safeParse(request.query);
  if (!parsed.success) return sendValidationError(response, parsed);

  try {
    return response.status(200).json(await listKarigars(prisma, parsed.data));
  } catch (error) {
    return handleServiceError(response, error);
  }
}

async function get(request, response) {
  const parsed = idSchema.safeParse(request.params.id);
  if (!parsed.success) return response.status(400).json({ error: "Invalid karigar id" });

  try {
    const karigar = await getKarigar(prisma, parsed.data);
    return karigar
      ? response.status(200).json({ karigar })
      : response.status(404).json({ error: "Karigar not found" });
  } catch (error) {
    return handleServiceError(response, error);
  }
}

async function update(request, response) {
  const id = idSchema.safeParse(request.params.id);
  const body = updateKarigarSchema.safeParse(request.body);
  if (!id.success) return response.status(400).json({ error: "Invalid karigar id" });
  if (!body.success) return sendValidationError(response, body);
  if (Object.keys(body.data).length === 0) return response.status(400).json({ error: "At least one field is required" });

  try {
    return response.status(200).json({ karigar: await updateKarigar(prisma, id.data, body.data) });
  } catch (error) {
    return handleServiceError(response, error);
  }
}

async function updateStatus(request, response) {
  const id = idSchema.safeParse(request.params.id);
  const body = statusSchema.safeParse(request.body);
  if (!id.success) return response.status(400).json({ error: "Invalid karigar id" });
  if (!body.success) return sendValidationError(response, body);

  try {
    return response.status(200).json({ karigar: await updateKarigarStatus(prisma, id.data, body.data.isActive) });
  } catch (error) {
    return handleServiceError(response, error);
  }
}

module.exports = { create, get, list, update, updateStatus };
