const multer = require("multer");

const env = require("../config/env");
const {
  ImageExtractionError,
  MAX_IMAGE_BYTES,
  createVisionClient,
  extractImageReading,
} = require("../service/image-extraction.service");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
});

const visionClient = createVisionClient({
  apiKey: env.VISION_API_KEY,
  apiUrl: env.VISION_API_URL,
  model: env.VISION_MODEL,
});

function uploadImage(request, response, next) {
  upload.single("image")(request, response, (error) => {
    if (!error) return next();
    if (error.code === "LIMIT_FILE_SIZE") {
      return response.status(413).json({ error: "Image must be 5 MB or smaller" });
    }
    return response.status(400).json({ error: "A valid image upload is required" });
  });
}

async function extract(request, response) {
  try {
    const reading = await extractImageReading({
      buffer: request.file?.buffer,
      mimetype: request.file?.mimetype,
      client: visionClient,
    });
    return response.status(200).json({ suggestion: reading });
  } catch (error) {
    if (error instanceof ImageExtractionError) {
      return response.status(error.statusCode).json({ error: error.message });
    }
    console.error("Image extraction request failed:", error);
    return response.status(502).json({ error: "Unable to extract a reading from the image" });
  }
}

module.exports = { extract, uploadImage };
