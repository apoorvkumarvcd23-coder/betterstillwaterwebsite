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
  const result = await pool.query(`
    SELECT
      c.relname AS table_name,
      a.atttypmod - 4 AS embedding_dims
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'testimonials'
      AND c.relname IN ('testimonials_dim_diabetes_amareye', 'testimonials_dim_amareye')
      AND a.attname = 'embedding'
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY c.relname
  `);

  console.log("Embedding column dimensions:");
  console.table(result.rows);
}

main()
  .catch((err) => {
    console.error("Failed to inspect dimensions:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
