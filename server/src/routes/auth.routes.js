const bcrypt = require("bcrypt");
const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

const env = require("../config/env");
const { prisma } = require("../lib/prisma");
const {
  AUTH_COOKIE_NAME,
  requireAuth,
} = require("../middleware/auth.middleware");

const router = express.Router();
const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const userProfileSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  };
}

router.post("/login", async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({
      error: "Invalid login request",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (!user || !user.isActive) {
    return response.status(401).json({ error: "Invalid credentials" });
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!passwordMatches) {
    return response.status(401).json({ error: "Invalid credentials" });
  }

  if (!env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured");
    return response.status(500).json({ error: "Authentication is not configured" });
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: "8h" },
  );

  const { passwordHash: _passwordHash, ...profile } = user;
  return response
    .cookie(AUTH_COOKIE_NAME, token, getCookieOptions())
    .status(200)
    .json({ user: profile });
});

router.post("/logout", (_request, response) => {
  return response
    .clearCookie(AUTH_COOKIE_NAME, getCookieOptions())
    .status(204)
    .send();
});

router.get("/me", requireAuth, async (request, response) => {
  const user = await prisma.user.findUnique({
    where: { id: request.user.id },
    select: userProfileSelect,
  });

  if (!user || !user.isActive) {
    return response.status(401).json({ error: "Authentication required" });
  }

  return response.status(200).json({ user });
});

module.exports = router;
