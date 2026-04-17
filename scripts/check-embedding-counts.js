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
      'diabetes' AS dataset,
      COUNT(*)::int AS total_rows,
      COUNT(*) FILTER (WHERE embedding IS NOT NULL)::int AS embedded_rows
    FROM testimonials.testimonials_dim_diabetes_amareye
    UNION ALL
    SELECT
      'amar_eye_yoga' AS dataset,
      COUNT(*)::int AS total_rows,
      COUNT(*) FILTER (WHERE embedding IS NOT NULL)::int AS embedded_rows
    FROM testimonials.testimonials_dim_amareye
  `);

  console.log("Embedding completion summary:");
  console.table(result.rows);
}

main()
  .catch((err) => {
    console.error("Failed to check counts:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
