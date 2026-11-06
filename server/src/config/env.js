const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  VISION_API_KEY: z.string().min(1).optional(),
  VISION_API_URL: z.string().url().default("https://api.openai.com/v1/chat/completions"),
  VISION_MODEL: z.string().min(1).default("gpt-4o-mini"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:", result.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = result.data;
