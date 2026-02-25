import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const sql = postgres(connectionString, {
  max: 10, // connection pool size
  idle_timeout: 30, // seconds before idle connections are closed
  connect_timeout: 10,
});

/**
 * Run the schema.sql file to create tables if they don't exist.
 * Safe to call on every startup (uses IF NOT EXISTS).
 */
export async function runMigrations() {
  const schemaPath = new URL("./schema.sql", import.meta.url);
  const schema = await Bun.file(schemaPath).text();
  await sql.unsafe(schema);
  console.log("✅ Database migrations applied");
}
