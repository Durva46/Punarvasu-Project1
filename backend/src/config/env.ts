/**
 * backend/src/config/env.ts
 *
 * Validates all required environment variables at startup.
 * The process exits immediately if any required variable is missing.
 * Import this module first in src/index.ts before anything else.
 */

function required(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`[env] FATAL: missing required environment variable "${name}"`);
    process.exit(1);
  }
  return val;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (Number.isNaN(n)) {
    console.error(`[env] FATAL: "${name}" must be a number, got "${raw}"`);
    process.exit(1);
  }
  return n;
}

export const env = {
  NODE_ENV: optional("NODE_ENV", "development") as "development" | "production" | "test",

  // Database
  DATABASE_URL: required("DATABASE_URL"),
  DIRECT_URL:   optional("DIRECT_URL", ""),   // only needed for migrations

  // Supabase (for JWT verification in routes)
  SUPABASE_URL:              required("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  SUPABASE_JWT_SECRET:       optional("SUPABASE_JWT_SECRET", ""),

  // Express
  PORT:     optionalNumber("PORT", 4000),
  API_HOST: optional("API_HOST", "0.0.0.0"),

  // CORS — comma-separated origins
  CORS_ORIGINS: optional("CORS_ORIGINS", "http://localhost:5173").split(",").map((s) => s.trim()),

  // Session (custom auth — kept for auth module compatibility)
  APP_BASE_URL:                    optional("APP_BASE_URL", "http://localhost:5173"),
  SESSION_SECRET:                  optional("SESSION_SECRET", ""),
  PASSWORD_PEPPER:                 optional("PASSWORD_PEPPER", ""),
  SESSION_TTL_MINUTES:             optionalNumber("SESSION_TTL_MINUTES", 480),
  SESSION_ABSOLUTE_TTL_MINUTES:    optionalNumber("SESSION_ABSOLUTE_TTL_MINUTES", 1440),

  // Rate limiting
  LOGIN_MAX_ATTEMPTS:              optionalNumber("LOGIN_MAX_ATTEMPTS", 5),
  LOGIN_LOCKOUT_MINUTES:           optionalNumber("LOGIN_LOCKOUT_MINUTES", 15),
  LOGIN_RATE_LIMIT_WINDOW_MINUTES: optionalNumber("LOGIN_RATE_LIMIT_WINDOW_MINUTES", 15),
  LOGIN_RATE_LIMIT_MAX:            optionalNumber("LOGIN_RATE_LIMIT_MAX", 10),
  GLOBAL_RATE_LIMIT_MAX:           optionalNumber("GLOBAL_RATE_LIMIT_MAX", 600),

  // Upload limits
  MAX_UPLOAD_BYTES: optionalNumber("MAX_UPLOAD_BYTES", 10_485_760),
  MAX_IMPORT_ROWS:  optionalNumber("MAX_IMPORT_ROWS", 20_000),

  // Misc
  ALLOW_DEMO_SEED: optional("ALLOW_DEMO_SEED", "false") === "true",
  TRUST_PROXY:     optionalNumber("TRUST_PROXY", 0),
} as const;
