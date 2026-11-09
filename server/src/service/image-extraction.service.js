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
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    (typeof value === "number" && !Number.isFinite(value))
  ) {
    throw new ImageExtractionError(422, `AI returned an invalid ${field}`);
  }
  try {
    const text = String(value).trim();
    const match = text.match(/^(?:gross\s*weight|weight|purity)?\s*[:=]?\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(?:g|grams?|%)?$/i);
    if (!match) {
      throw new Error("empty decimal");
    }
    return new Prisma.Decimal(match[1]);
  } catch {
    throw new ImageExtractionError(422, `AI returned an invalid ${field}`);
  }
}

function validateExtraction(raw) {
  if (!raw || typeof raw !== "object") {
    throw new ImageExtractionError(422, "The image reading was not structured JSON");
  }
  console.log("Gemini extraction fields:", {
    grossWeight: { type: typeof raw.grossWeight, value: raw.grossWeight },
    purity: { type: typeof raw.purity, value: raw.purity },
    unit: { type: typeof raw.unit, value: raw.unit },
    confidence: { type: typeof raw.confidence, value: raw.confidence },
    uncertainty: { type: typeof raw.uncertainty, value: raw.uncertainty },
  });
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

async function getProviderError(response) {
  try {
    const body = await response.json();
    const message = body.error?.message;
    return typeof message === "string" ? message : null;
  } catch {
    return null;
  }
}

function createVisionClient({ apiKey, apiUrl, model, fetchImpl = fetch }) {
  return {
    async extract(buffer, mimeType) {
      if (!apiKey) throw new ImageExtractionError(503, "Image extraction is not configured");
      const endpoint = apiUrl.replace("{model}", encodeURIComponent(model));
      const request = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                grossWeight: { type: "STRING" },
                purity: { type: "STRING" },
                unit: { type: "STRING" },
                visibleReading: { type: "STRING" },
                confidence: { type: "NUMBER" },
                uncertainty: { type: "STRING", nullable: true },
              },
              required: ["grossWeight", "purity", "unit", "visibleReading", "confidence", "uncertainty"],
            },
          },
          contents: [{
            parts: [
              { text: "Read the visible weighing-scale gross weight and purity from this image. Return only the requested JSON. Do not infer fine gold, do not calculate anything, and report ambiguity in uncertainty." },
              { inlineData: { mimeType, data: buffer.toString("base64") } },
            ],
          }],
        }),
      };
      let response = await fetchImpl(endpoint, request);
      if (response.status === 429 || response.status === 503) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        response = await fetchImpl(endpoint, request);
      }
      if (!response.ok) {
        const providerMessage = await getProviderError(response);
        if (response.status === 401 || response.status === 403) {
          throw new ImageExtractionError(502, "Gemini API key is invalid or does not have access to the configured model");
        }
        if (response.status === 404) {
          throw new ImageExtractionError(502, `Gemini model "${model}" is unavailable`);
        }
        if (response.status === 429) {
          throw new ImageExtractionError(502, "Gemini API quota or rate limit was exceeded");
        }
        if (response.status === 503) {
          throw new ImageExtractionError(502, "Gemini is temporarily busy; please try again");
        }
        console.error("Gemini image extraction failed:", response.status, providerMessage ?? "unknown provider error");
        throw new ImageExtractionError(502, "Gemini could not read the image");
      }
      const body = await response.json();
      return extractJson(body.candidates?.[0]?.content?.parts?.[0]?.text);
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
