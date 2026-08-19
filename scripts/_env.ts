/**
 * Side-effect module: loads env from .env then .env.local (overriding).
 *
 * Import this at the very TOP of any tsx script that needs env vars set
 * before other imports execute — module bodies run in import order, so
 * placing this before `import { db }` etc. guarantees DATABASE_URL,
 * CLOUDFLARE_R2_*, ANTHROPIC_API_KEY, etc. are populated before those
 * modules' top-level code reads process.env.
 *
 * Necessary because Next.js loads .env.local automatically but tsx does
 * not — dotenv/config only reads .env. Keeping this in one place means
 * every script that needs both files can just `import "./_env";`.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });
