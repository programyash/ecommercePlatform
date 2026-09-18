import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../utils/ApiResponse";

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  statusCode?: number;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

/**
 * Creates an in-memory rate limiting middleware with sliding expiration.
 * No external dependencies required, strictly type-safe.
 */
export function rateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = "Too many requests from this IP, please try again later",
    statusCode = 429,
  } = options;

  const hits = new Map<string, ClientRecord>();

  // Cleanup expired client records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref(); // unref so timer doesn't keep node process alive during tests

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, allow bypassing rate limit unless explicitly testing rate limit
    if (process.env.NODE_ENV === "test" && !req.headers["x-test-rate-limit"]) {
      return next();
    }

    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "127.0.0.1";
    const now = Date.now();

    let record = hits.get(clientIp);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      hits.set(clientIp, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSeconds);

    if (record.count > max) {
      res.setHeader("Retry-After", resetSeconds);
      res.status(statusCode).json(ApiResponse.error(message, statusCode));
      return;
    }

    next();
  };
}

// Pre-configured rate limiters
export const globalLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 min
  message: "Global rate limit exceeded. Please wait a few minutes before trying again.",
});

export const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 attempts per 15 min
  message: "Too many login/registration attempts. Please try again in 15 minutes.",
});
