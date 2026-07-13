import rateLimit from "express-rate-limit";

/**
 * Limits only apply in production (Docker/hosted set NODE_ENV=production).
 * The client legitimately polls 7 endpoints every 4s (~105 req/min, more on the
 * admin tab), so dev browsing and tests would constantly trip the limiter.
 */
const skipOutsideProduction = () => process.env.NODE_ENV !== "production";

/**
 * Global API rate limit (~300 req/min per IP). Sized for the polling client:
 * one active tab is ~105-160 req/min, so 100 was throttling a single real user;
 * 300 allows a couple of tabs per IP while still capping abuse at ~5 req/s.
 */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOutsideProduction,
  message: { error: "Too many requests" },
});

/** Stricter bucket for write-heavy routes (~30 req/min per IP). */
export const writeLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOutsideProduction,
  message: { error: "Too many write requests" },
});

/** Group join attempts (~20 per hour per IP). */
export const joinLimiter = rateLimit({
  windowMs: 60 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOutsideProduction,
  message: { error: "Too many join attempts" },
});
