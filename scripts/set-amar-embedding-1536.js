require("dotenv").config();
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const databaseUrlRequiresSsl = /[?&]sslmode=require/i.test(String(DATABASE_URL || ""));
const forceDbSsl = String(process.env.DB_SSL || "").trim().toLowerCase() === "true";
const useDbSsl = process.env.NODE_ENV === "production" || databaseUrlRequiresSsl || forceDbSsl;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useDbSsl ? { rejectUnauthorized: false } : false,
});

async function main() {
  await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
  await pool.query("ALTER TABLE testimonials.testimonials_dim_amareye DROP COLUMN IF EXISTS embedding");
  await pool.query("ALTER TABLE testimonials.testimonials_dim_amareye ADD COLUMN embedding vector(1536)");
  console.log("Updated testimonials.testimonials_dim_amareye.embedding to vector(1536)");
}

main()
  .catch((err) => {
    console.error("Failed to alter amar table embedding column:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
