const { Prisma } = require("@prisma/client");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

class ImageExtractionError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function detectImageType(buffer) {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

function parseDecimal(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ImageExtractionError(422, `AI returned an invalid ${field}`);
  }
  try {
    return new Prisma.Decimal(value.trim());
  } catch {
    throw new ImageExtractionError(422, `AI returned an invalid ${field}`);
  }
}

function validateExtraction(raw) {
  if (!raw || typeof raw !== "object") {
    throw new ImageExtractionError(422, "The image reading was not structured JSON");
  }
  const grossWeight = parseDecimal(raw.grossWeight, "gross weight");
  const purity = parseDecimal(raw.purity, "purity");
  if (!grossWeight.gt(0)) throw new ImageExtractionError(422, "AI returned a non-positive gross weight");
  if (purity.lt(0) || purity.gt(100)) throw new ImageExtractionError(422, "AI returned purity outside 0 to 100");
  if (typeof raw.unit !== "string" || raw.unit.trim().toLowerCase() !== "g") {
    throw new ImageExtractionError(422, "The image reading must use grams (g)");
  }
  return {
    grossWeight: grossWeight.toFixed(3),
    purity: purity.toFixed(2),
    unit: "g",
    visibleReading: typeof raw.visibleReading === "string" ? raw.visibleReading : "",
    confidence: typeof raw.confidence === "number" && raw.confidence >= 0 && raw.confidence <= 1 ? raw.confidence : null,
    uncertainty: typeof raw.uncertainty === "string" ? raw.uncertainty : null,
  };
}

function extractJson(content) {
  if (typeof content !== "string") throw new ImageExtractionError(502, "Vision provider returned no text");
  try {
    return JSON.parse(content);
  } catch {
    throw new ImageExtractionError(502, "Vision provider returned malformed JSON");
  }
}

function createVisionClient({ apiKey, apiUrl, model, fetchImpl = fetch }) {
  return {
    async extract(buffer, mimeType) {
      if (!apiKey) throw new ImageExtractionError(503, "Image extraction is not configured");
      const response = await fetchImpl(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "weight_purity_reading",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  grossWeight: { type: "string" },
                  purity: { type: "string" },
                  unit: { type: "string" },
                  visibleReading: { type: "string" },
                  confidence: { type: "number" },
                  uncertainty: { type: ["string", "null"] },
                },
                required: ["grossWeight", "purity", "unit", "visibleReading", "confidence", "uncertainty"],
              },
            },
          },
          messages: [{
            role: "user",
            content: [
              { type: "text", text: "Read the visible weighing-scale gross weight and purity from this image. Return only the requested JSON. Do not infer fine gold, do not calculate anything, and report ambiguity in uncertainty." },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${buffer.toString("base64")}` } },
            ],
          }],
        }),
      });
      if (!response.ok) throw new ImageExtractionError(502, "Vision provider could not read the image");
      const body = await response.json();
      return extractJson(body.choices?.[0]?.message?.content);
    },
  };
}

async function extractImageReading({ buffer, mimetype, client }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new ImageExtractionError(400, "An image is required");
  if (buffer.length > MAX_IMAGE_BYTES) throw new ImageExtractionError(413, "Image must be 5 MB or smaller");
  const actualMimeType = detectImageType(buffer);
  if (!actualMimeType || !ACCEPTED_MIME_TYPES.has(actualMimeType) || (mimetype && mimetype !== actualMimeType)) {
    throw new ImageExtractionError(400, "Only valid JPEG, PNG, or WebP images are supported");
  }
  try {
    return validateExtraction(await client.extract(buffer, actualMimeType));
  } catch (error) {
    if (error instanceof ImageExtractionError) throw error;
    throw new ImageExtractionError(502, "Unable to extract a reading from the image");
  }
}

module.exports = {
  ACCEPTED_MIME_TYPES,
  ImageExtractionError,
  MAX_IMAGE_BYTES,
  createVisionClient,
  detectImageType,
  extractImageReading,
  validateExtraction,
};
