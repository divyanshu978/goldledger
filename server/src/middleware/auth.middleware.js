const jwt = require("jsonwebtoken");

const { prisma } = require("../lib/prisma");
const env = require("../config/env");

const AUTH_COOKIE_NAME = "goldledger_token";

function getTokenFromRequest(request) {
  const header = request.get("authorization");
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }

  const cookieHeader = request.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));

  return cookie ? decodeURIComponent(cookie.slice(AUTH_COOKIE_NAME.length + 1)) : null;
}

async function requireAuth(request, response, next) {
  const token = getTokenFromRequest(request);

  if (!token) {
    return response.status(401).json({ error: "Authentication required" });
  }

  if (!env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured");
    return response.status(500).json({ error: "Authentication is not configured" });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload !== "object" || typeof payload.sub !== "string") {
      return response.status(401).json({ error: "Invalid authentication token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return response.status(401).json({ error: "Authentication required" });
    }

    request.user = user;
    return next();
  } catch (error) {
    if (error.name !== "JsonWebTokenError" && error.name !== "TokenExpiredError") {
      console.error("Authentication lookup failed:", error);
    }
    return response.status(401).json({ error: "Invalid authentication token" });
  }
}

function requireRole(...allowedRoles) {
  return (request, response, next) => {
    if (!request.user) {
      return response.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return response.status(403).json({ error: "Insufficient permissions" });
    }

    return next();
  };
}

module.exports = {
  AUTH_COOKIE_NAME,
  requireAuth,
  requireRole,
};
