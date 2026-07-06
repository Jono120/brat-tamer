import rateLimit from "express-rate-limit";

const skipInTest = () => process.env.NODE_ENV === "test";

/** Global API rate limit (~100 req/min per IP). */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: "Too many requests" },
});

/** Stricter bucket for write-heavy routes (~10 req/min per IP). */
export const writeLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: "Too many write requests" },
});
