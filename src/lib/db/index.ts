import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

// Local SQLite by default; a libsql:// URL (e.g. Turso) works the same way.
const url = process.env.DATABASE_URL || "file:./data/guardian.db";

if (url.startsWith("file:")) {
  mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
}

const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });

export const db = drizzle(client, { schema });

// Run migrations once per server process so a fresh clone works with `npm run dev`.
const globalForDb = globalThis as unknown as { guardianMigrated?: Promise<void> };

export function ready() {
  globalForDb.guardianMigrated ??= migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });
  return globalForDb.guardianMigrated;
}

export { schema };
