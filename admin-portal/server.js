// Stilwater Management Analytics Portal
// ─────────────────────────────────────────────────────────────────────────────
// A small, login-gated dashboard for management:
//   • KPI cards (users, new vs returning, active users, feature usage, …)
//   • a natural-language chatbot ("How many users signed up yesterday?") that
//     turns the question into a READ-ONLY SQL query, runs it, and shows the data.
//
// Runs as its OWN Render web service (separate from the main app). It only READS
// the production database. Three layers protect the DB from the LLM:
//   1. keyword/shape validation (must be a single SELECT/WITH statement),
//   2. every query runs inside a READ ONLY transaction with a statement timeout,
//   3. (recommended) point DATABASE_URL at a read-only Postgres role — see README.
const express = require("express");
const session = require("express-session");
const path = require("path");
const { Pool } = require("pg");

// ── config (all from env) ────────────────────────────────────────────────────
const PORT = process.env.PORT || 10000;
const DATABASE_URL = process.env.DATABASE_URL;
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-in-render";
const ADMIN_EMAILS = String(process.env.ADMIN_PORTAL_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
const ADMIN_PASSWORD = process.env.ADMIN_PORTAL_PASSWORD || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_BASE_URL = String(process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
const MODEL = process.env.ADMIN_PORTAL_MODEL || "anthropic/claude-sonnet-4.5";

if (!DATABASE_URL) { console.error("DATABASE_URL is required."); process.exit(1); }
if (!ADMIN_EMAILS.length || !ADMIN_PASSWORD) {
  console.warn("[admin-portal] ADMIN_PORTAL_EMAILS / ADMIN_PORTAL_PASSWORD not set — login will reject everyone.");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: /sslmode=require/i.test(DATABASE_URL) || process.env.DB_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined,
  max: 5,
});

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "200kb" }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 12 },
}));

const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) return next();
  if (req.path.startsWith("/api/")) return res.status(401).json({ error: "Not logged in" });
  return res.redirect("/");
};

// ── auth ─────────────────────────────────────────────────────────────────────
app.post("/api/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (ADMIN_EMAILS.includes(email) && password && password === ADMIN_PASSWORD) {
    req.session.user = email;
    return res.json({ ok: true, email });
  }
  return res.status(401).json({ error: "Invalid email or password" });
});
app.post("/api/logout", (req, res) => { req.session.destroy(() => res.json({ ok: true })); });
app.get("/api/me", (req, res) => res.json({ user: (req.session && req.session.user) || null }));

// ── read-only SQL execution ──────────────────────────────────────────────────
const FORBIDDEN = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|merge|call|do|vacuum|reindex|comment|attach|lock|listen|notify|set\s+role|set\s+session|pg_sleep|pg_read_file|pg_ls_dir|lo_import|lo_export|dblink)\b/i;

function sanitizeSql(raw) {
  let sql = String(raw || "").trim();
  // Strip ```sql ... ``` fences if the model added them.
  sql = sql.replace(/^```(?:sql)?\s*/i, "").replace(/\s*```$/i, "").trim();
  sql = sql.replace(/;\s*$/, "").trim(); // drop a single trailing semicolon
  if (!sql) throw new Error("Empty query.");
  if (sql.includes(";")) throw new Error("Only a single statement is allowed.");
  if (!/^(with|select)\b/i.test(sql)) throw new Error("Only SELECT/WITH (read-only) queries are allowed.");
  if (FORBIDDEN.test(sql)) throw new Error("Query contains a disallowed keyword (read-only only).");
  if (!/\blimit\b/i.test(sql)) sql += "\nLIMIT 1000";
  return sql;
}

async function runReadOnly(sql) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET TRANSACTION READ ONLY");
    await client.query("SET LOCAL statement_timeout = 8000"); // 8s cap
    const r = await client.query(sql);
    await client.query("ROLLBACK");
    return { columns: r.fields.map((f) => f.name), rows: r.rows };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_e) {}
    throw err;
  } finally {
    client.release();
  }
}

// ── the schema we tell the model about (read-only analytics) ─────────────────
const SCHEMA_DOC = `
You write a SINGLE read-only PostgreSQL SELECT (or WITH ... SELECT) query for an
analytics dashboard. NEVER write to the DB. Timestamps are stored in UTC — for
"today"/"a day" in India time, wrap with: (created_at AT TIME ZONE 'Asia/Kolkata')::date.

Tables (schema public unless noted):
- users(id text, name, email, role)                         -- Google/OAuth accounts (one row per user, NO created_at)
- users_phone(id bigint, phone, name, role, created_at)     -- phone accounts
- login_events(id, user_id text, user_type text['oauth'|'phone'], identifier text=email-for-google, method text['google'|'phone'], ip, user_agent, created_at)
    -- ONE row per sign-in. Repeat logins = multiple rows, same user_id. Join user_id -> users.id (oauth) or users_phone.id (phone, cast id::text).
- credit_events(id, auth_user_type, auth_user_id, email, name, action text, cost int, balance_after int, created_at)
    -- FEATURE USAGE ledger. action is 'nutrition_chat' | 'tadasana_watch_learn' | 'balasana_watch_learn'. Started ~2026-06-05 evening IST.
- user_credits(auth_user_type, auth_user_id, email, name, balance int, total_spent int, updated_at)  -- current balance per user
- yoga_clicks(id, auth_user_type, auth_user_id, email, name, asana, asana_key, created_at)            -- one row per yoga Watch&Learn click
- intake_submissions(id, name, phone, age, chronic_conditions, eyesight_issues, auth_user_type, auth_user_id, completed_at, created_at, ...)  -- wellness assessment
- partner_leads(id, name, phone, email, partner, auth_user_type, auth_user_id, created_at)            -- "Book a consultation" leads
- page_views(id, visitor_id, auth_user_type, auth_user_id, path, page_title, referrer, created_at, ...) -- page visits (consent-gated; may undercount)
- aria.chat_sessions(id, auth_user_type, auth_user_id, mode text['nutrition'|'chronic'|'general'], title, messages jsonb, created_at, updated_at)
    -- messages is a JSON array of {role:'user'|'assistant', text}. User QUESTIONS = elements where role='user'. Use jsonb_array_elements(messages).

Key facts:
- "Active users" (people USING the app) = distinct users in credit_events / chat_sessions / page_views — NOT login_events (logins only count re-auth).
- A name for a user: COALESCE(u.name, up.name) joining users u (oauth) and users_phone up (phone).
- Prefer clear column aliases. Always include a LIMIT. Output ONLY the SQL, no prose, no markdown fences.
`;

async function askModelForSql(question) {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured on this service.");
  const resp = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "X-Title": "Stilwater Admin Portal",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: "You are a senior analytics engineer. " + SCHEMA_DOC },
        { role: "user", content: String(question || "").slice(0, 2000) },
      ],
    }),
  });
  if (!resp.ok) throw new Error("Model error (" + resp.status + ").");
  const data = await resp.json();
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
}

async function summarize(question, columns, rows) {
  if (!OPENROUTER_API_KEY) return "";
  try {
    const sample = JSON.stringify(rows.slice(0, 30));
    const resp = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json", "X-Title": "Stilwater Admin Portal" },
      body: JSON.stringify({
        model: MODEL, temperature: 0.2,
        messages: [
          { role: "system", content: "Answer the user's analytics question in 1-2 short sentences using ONLY the result rows provided. Be precise with numbers. No preamble." },
          { role: "user", content: `Question: ${question}\nColumns: ${columns.join(", ")}\nRows: ${sample}` },
        ],
      }),
    });
    if (!resp.ok) return "";
    const d = await resp.json();
    return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || "";
  } catch (_e) { return ""; }
}

// POST /api/ask { question } -> { sql, columns, rows, summary }
app.post("/api/ask", requireAuth, async (req, res) => {
  const question = String(req.body?.question || "").trim();
  if (!question) return res.status(400).json({ error: "Ask a question." });
  let sqlRaw;
  try { sqlRaw = await askModelForSql(question); }
  catch (e) { return res.status(502).json({ error: "Couldn't reach the model: " + e.message }); }
  let sql;
  try { sql = sanitizeSql(sqlRaw); }
  catch (e) { return res.status(400).json({ error: e.message, sql: sqlRaw }); }
  try {
    const { columns, rows } = await runReadOnly(sql);
    const summary = await summarize(question, columns, rows);
    return res.json({ ok: true, sql, columns, rows, rowCount: rows.length, summary });
  } catch (e) {
    return res.status(400).json({ error: "Query failed: " + e.message, sql });
  }
});

// ── KPIs ─────────────────────────────────────────────────────────────────────
app.get("/api/kpis", requireAuth, async (_req, res) => {
  try {
    const q = await runReadOnly(`
      WITH t AS (SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date AS today)
      SELECT
        (SELECT COUNT(*) FROM users) + (SELECT COUNT(*) FROM users_phone)                          AS total_users,
        (SELECT COUNT(*) FROM login_events le, t WHERE (le.created_at AT TIME ZONE 'Asia/Kolkata')::date = t.today) AS logins_today,
        (SELECT COUNT(DISTINCT user_id) FROM login_events le, t WHERE user_id IS NOT NULL AND (le.created_at AT TIME ZONE 'Asia/Kolkata')::date = t.today) AS users_logged_in_today,
        (SELECT COUNT(DISTINCT user_id) FROM login_events le, t WHERE user_id IS NOT NULL AND (le.created_at AT TIME ZONE 'Asia/Kolkata')::date = t.today
            AND user_id IN (SELECT user_id FROM login_events GROUP BY user_id
                            HAVING (MIN(created_at) AT TIME ZONE 'Asia/Kolkata')::date = (SELECT today FROM t))) AS new_users_today,
        (SELECT COUNT(DISTINCT auth_user_id) FROM credit_events ce, t WHERE (ce.created_at AT TIME ZONE 'Asia/Kolkata')::date = t.today) AS active_users_today,
        (SELECT COUNT(*) FROM credit_events ce, t WHERE ce.action='nutrition_chat' AND (ce.created_at AT TIME ZONE 'Asia/Kolkata')::date = t.today) AS nutrition_chats_today,
        (SELECT COUNT(*) FROM yoga_clicks yc, t WHERE (yc.created_at AT TIME ZONE 'Asia/Kolkata')::date = t.today) AS yoga_clicks_today,
        (SELECT COUNT(*) FROM intake_submissions) AS assessments_total,
        (SELECT COUNT(*) FROM partner_leads) AS partner_leads_total,
        (SELECT COALESCE(SUM(cost),0) FROM credit_events) AS credits_spent_total
    `);
    res.json({ ok: true, kpis: q.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Daily series for a chart: new users + active users per IST day, last N days.
app.get("/api/kpis/daily", requireAuth, async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 90);
  try {
    const q = await runReadOnly(`
      WITH days AS (
        SELECT generate_series(((now() AT TIME ZONE 'Asia/Kolkata')::date - ${days - 1}), (now() AT TIME ZONE 'Asia/Kolkata')::date, interval '1 day')::date AS d
      ),
      firsts AS (SELECT user_id, (MIN(created_at) AT TIME ZONE 'Asia/Kolkata')::date AS first_d FROM login_events WHERE user_id IS NOT NULL GROUP BY user_id)
      SELECT to_char(days.d,'YYYY-MM-DD') AS day,
        (SELECT COUNT(*) FROM firsts f WHERE f.first_d = days.d)                                                                AS new_users,
        (SELECT COUNT(DISTINCT auth_user_id) FROM credit_events ce WHERE (ce.created_at AT TIME ZONE 'Asia/Kolkata')::date = days.d) AS active_users,
        (SELECT COUNT(DISTINCT user_id) FROM login_events le WHERE user_id IS NOT NULL AND (le.created_at AT TIME ZONE 'Asia/Kolkata')::date = days.d) AS users_logged_in
      FROM days ORDER BY days.d
    `);
    res.json({ ok: true, days: q.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── static (login page public; dashboard gated) ──────────────────────────────
app.get("/", (req, res) => {
  if (req.session && req.session.user) return res.redirect("/dashboard");
  res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.get("/dashboard", requireAuth, (_req, res) => res.sendFile(path.join(__dirname, "public", "dashboard.html")));
app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`[admin-portal] listening on :${PORT}  (model: ${MODEL})`));
