import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

let db: ReturnType<typeof drizzle>;
let pool: pg.Pool | null = null;

// PostgreSQL for production/Supabase
console.log("Using PostgreSQL database");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

db = drizzle(pool, { schema });

export { db, pool };
