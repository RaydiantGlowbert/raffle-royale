import { neon } from "@neondatabase/serverless";

export function getDatabaseUrl() {
  const direct = String(process.env.DATABASE_URL || "").trim();
  if (direct) {
    return direct;
  }

  const fallback = String(process.env.POSTGRES_URL || "").trim();
  if (fallback) {
    return fallback;
  }

  return "";
}

export function getSqlClient() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    return null;
  }

  return neon(connectionString);
}
