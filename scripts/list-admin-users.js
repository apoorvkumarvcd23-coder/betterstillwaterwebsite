const { Pool } = require('pg');

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://stillwater:stillwater@localhost:5433/stillwater';

const pool = new Pool({ connectionString, ssl: false });

async function main() {
  try {
    const oauth = await pool.query(
      "SELECT id, email, name, role FROM users WHERE role = 'admin' ORDER BY id ASC",
    );

    const phone = await pool.query(
      "SELECT id, phone, name, role FROM users_phone WHERE role = 'admin' ORDER BY id ASC",
    );

    console.log('oauth_admins:', JSON.stringify(oauth.rows, null, 2));
    console.log('phone_admins:', JSON.stringify(phone.rows, null, 2));
  } catch (err) {
    console.error('Failed to query DB:', err.message || err);
    process.exitCode = 2;
  } finally {
    await pool.end();
  }
}

main();
