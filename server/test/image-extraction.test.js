const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const {
  ImageExtractionError,
  createVisionClient,
  extractImageReading,
} = require("../src/service/image-extraction.service");

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function extract(response, mimetype = "image/png") {
  return extractImageReading({
    buffer: png,
    mimetype,
    client: { extract: async () => response },
  });
}

describe("image extraction service", () => {
  it("uses the Gemini generateContent contract", async () => {
    let request;
    const client = createVisionClient({
      apiKey: "test-gemini-key",
      apiUrl: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
      model: "gemini-3.1-flash-lite",
      fetchImpl: async (url, options) => {
        request = { url, options };
        return {
          ok: true,
          json: async () => ({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    grossWeight: "12.345",
                    purity: "91.60",
                    unit: "g",
                    visibleReading: "12.345 g / 91.60",
                    confidence: 0.94,
                    uncertainty: null,
                  }),
                }],
              },
            }],
          }),
        };
      },
    });

    const reading = await client.extract(png, "image/png");
    const body = JSON.parse(request.options.body);
    assert.equal(reading.grossWeight, "12.345");
    assert.equal(request.url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent");
    assert.equal(body.contents[0].parts[1].inlineData.mimeType, "image/png");
    assert.equal(body.generationConfig.responseMimeType, "application/json");
    assert.equal(request.options.headers["x-goog-api-key"], "test-gemini-key");
  });

  it("validates a structured AI reading", async () => {
    const reading = await extract({
      grossWeight: "12.345",
      purity: "91.60",
      unit: "g",
      visibleReading: "12.345 g / 91.60",
      confidence: 0.94,
      uncertainty: null,
    });
    assert.deepEqual(reading, {
      grossWeight: "12.345",
      purity: "91.60",
      unit: "g",
      visibleReading: "12.345 g / 91.60",
      confidence: 0.94,
      uncertainty: null,
    });
  });

  it("rejects malformed AI output", async () => {
    await assert.rejects(() => extract("not-json"), (error) => {
      assert.equal(error.statusCode, 422);
      return true;
    });
  });

  it("rejects unreadable or unsupported image bytes", async () => {
    await assert.rejects(
      () => extractImageReading({
        buffer: Buffer.from("not-an-image"),
        mimetype: "image/png",
        client: { extract: async () => ({}) },
      }),
      (error) => error instanceof ImageExtractionError && error.statusCode === 400,
    );
  });

  it("rejects invalid AI weight and purity", async () => {
    await assert.rejects(() => extract({
      grossWeight: "0",
      purity: "91.60",
      unit: "g",
      visibleReading: "",
      confidence: 0.5,
      uncertainty: "Unreadable weight",
    }), /non-positive gross weight/);
    await assert.rejects(() => extract({
      grossWeight: "12.000",
      purity: "101",
      unit: "g",
      visibleReading: "",
      confidence: 0.5,
      uncertainty: "Unclear purity",
    }), /purity outside/);
  });

  it("normalizes numeric and percent-formatted AI readings", async () => {
    const reading = await extract({
      grossWeight: 12.345,
      purity: "91.60%",
      unit: "g",
      visibleReading: "12.345 g / 91.60%",
      confidence: 0.9,
      uncertainty: null,
    });
    assert.equal(reading.grossWeight, "12.345");
    assert.equal(reading.purity, "91.60");
  });

  it("normalizes labeled readings returned by vision providers", async () => {
    const reading = await extract({
      grossWeight: "Weight: 12.345 g",
      purity: "Purity: 91.60%",
      unit: "g",
      visibleReading: "12.345 g / 91.60%",
      confidence: 0.9,
      uncertainty: null,
    });
    assert.equal(reading.grossWeight, "12.345");
    assert.equal(reading.purity, "91.60");
  });

  it("returns a provider failure as a controlled error", async () => {
    await assert.rejects(
      () => extractImageReading({
        buffer: png,
        mimetype: "image/png",
        client: { extract: async () => { throw new Error("provider unavailable"); } },
      }),
      (error) => error.statusCode === 502,
    );
  });
});
