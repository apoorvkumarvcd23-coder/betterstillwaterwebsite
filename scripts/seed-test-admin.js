const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://stillwater:stillwater@localhost:5433/stillwater";

const phone = process.env.TEST_ADMIN_PHONE || "9000000001";
const password = process.env.TEST_ADMIN_PASSWORD || "StillwaterAdmin#123";
const name = process.env.TEST_ADMIN_NAME || "Test Admin";

async function main() {
  const databaseUrlRequiresSsl = /[?&]sslmode=require/i.test(
    String(connectionString || ""),
  );
  const forceDbSsl = String(process.env.DB_SSL || "")
    .trim()
    .toLowerCase() === "true";
  const useDbSsl = databaseUrlRequiresSsl || forceDbSsl;

  const pool = new Pool({
    connectionString,
    ssl: useDbSsl ? { rejectUnauthorized: false } : false,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users_phone (
        id BIGSERIAL PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'customer',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Ensure login_events table exists so seed can run on fresh DB
    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_events (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT,
        user_type TEXT,
        identifier TEXT,
        method TEXT,
        ip TEXT,
        user_agent TEXT,
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
        INSERT INTO users_phone (phone, name, password_hash, role)
        VALUES ($1, $2, $3, 'admin')
        ON CONFLICT (phone)
        DO UPDATE SET
          name = EXCLUDED.name,
          password_hash = EXCLUDED.password_hash,
          role = 'admin'
        RETURNING id, phone, name, role
      `,
      [phone, name, passwordHash],
    );

    const admin = result.rows[0];
    console.log(
      `[seed-test-admin] Admin seeded: phone=${admin.phone}, role=${admin.role}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[seed-test-admin] Failed:", error.message);
  process.exit(1);
});
