const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_API_URL: z.string().url().default("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.0-flash"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:", result.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = result.data;
