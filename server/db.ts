import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import pg from "pg";
import * as schema from "@shared/schema";
import path from "path";

// Determine which database to use based on environment
const useSqlite = !process.env.DATABASE_URL || process.env.USE_SQLITE === "true";

let db: ReturnType<typeof drizzlePg> | ReturnType<typeof drizzleSqlite>;
let pool: pg.Pool | null = null;

// PostgreSQL for production/Supabase
console.log("Using PostgreSQL database");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

db = drizzlePg(pool, { schema });

export { db, pool };
