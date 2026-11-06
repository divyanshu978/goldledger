const { z } = require("zod");

const { prisma } = require("../lib/prisma");
const {
  ReturnReviewError,
  decideReturn,
  listPendingReturns,
} = require("../service/return-review.service");

const idSchema = z.string().uuid();
const decisionSchema = z.object({
  decision: z.enum(["ACCEPTED", "REJECTED"]),
  rejectionReason: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
  if (value.decision === "REJECTED" && !value.rejectionReason) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rejectionReason"],
      message: "Rejection reason is required",
    });
  }
});

function handleError(response, error) {
  if (error instanceof ReturnReviewError) {
    return response.status(error.statusCode).json({ error: error.message });
  }
  console.error("Return review request failed:", error);
  return response.status(500).json({ error: "Unable to process return review" });
}

async function list(request, response) {
  try {
    return response.status(200).json({ items: await listPendingReturns(prisma) });
  } catch (error) {
    return handleError(response, error);
  }
}

async function decide(request, response) {
  const id = idSchema.safeParse(request.params.transactionId);
  const body = decisionSchema.safeParse(request.body);
  if (!id.success) return response.status(400).json({ error: "Invalid transaction id" });
  if (!body.success) {
    return response.status(400).json({
      error: "Invalid return review request",
      details: body.error.flatten().fieldErrors,
    });
  }
  try {
    return response.status(200).json({
      review: await decideReturn(
        prisma,
        id.data,
        request.user.id,
        body.data.decision,
        body.data.rejectionReason,
      ),
    });
  } catch (error) {
    return handleError(response, error);
  }
}

module.exports = { decide, list };
