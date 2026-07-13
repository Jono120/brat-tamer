/**
 * Loads .env / .env.local before any other server module evaluates.
 * Must be the FIRST import in the entrypoint: ES module imports are hoisted and
 * evaluated in order, so calling dotenv.config() in the entrypoint body runs too
 * late for modules like db.ts that read process.env at module scope.
 */
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });
