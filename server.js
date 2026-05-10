require("dotenv").config();
require("dotenv").config({ path: ".env.local", override: true });
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const path = require("path");
const cors = require("cors");
const { Pool } = require("pg");
const PgSession = require("connect-pg-simple")(session);

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

const DEFAULT_ADMIN_EMAILS = new Set(["amar@stillwater.you", "amar.dani@stillwater.you"]);

const isAdminEmail = (email) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) return false;

  if (DEFAULT_ADMIN_EMAILS.has(normalizedEmail)) {
    return true;
  }

  const envAdmins = String(process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return envAdmins.includes(normalizedEmail);
};

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const isProd = process.env.NODE_ENV === "production";
const rawCookieDomain = (process.env.COOKIE_DOMAIN || "").trim();
const databaseUrlRequiresSsl = /[?&]sslmode=require/i.test(String(DATABASE_URL || ""));
const forceDbSsl = String(process.env.DB_SSL || "").trim().toLowerCase() === "true";
const useDbSsl = isProd || databaseUrlRequiresSsl || forceDbSsl;
const cookieDomain =
  rawCookieDomain && !/\.?(onrender\.com)$/i.test(rawCookieDomain)
    ? rawCookieDomain
    : undefined;

if (rawCookieDomain && !cookieDomain) {
  console.warn(
    "COOKIE_DOMAIN is set to a shared domain and will be ignored. Using host-only session cookies.",
  );
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useDbSsl ? { rejectUnauthorized: false } : false,
});

const RAG_SHARAN_DATABASE_URL = String(process.env.RAG_SHARAN_DATABASE_URL || "").trim();
const sharanDatabaseUrlRequiresSsl = /[?&]sslmode=require/i.test(String(RAG_SHARAN_DATABASE_URL || ""));
const useSharanDbSsl = isProd || sharanDatabaseUrlRequiresSsl || forceDbSsl;
const sharanRagPool = RAG_SHARAN_DATABASE_URL
  ? new Pool({
      connectionString: RAG_SHARAN_DATABASE_URL,
      ssl: useSharanDbSsl ? { rejectUnauthorized: false } : false,
    })
  : null;

const CUSTOMER_ASSESSMENT_REDIRECT = "/intake.html";
const CUSTOMER_CARE_PATH_REDIRECT = "/care-path.html";
const ASSESSMENT_V2_CUTOFF_ISO =
  process.env.ASSESSMENT_V2_CUTOFF_ISO || "2026-04-20T00:00:00.000Z";
const parsedAssessmentCutoff = new Date(ASSESSMENT_V2_CUTOFF_ISO);
const ASSESSMENT_V2_CUTOFF = Number.isNaN(parsedAssessmentCutoff.getTime())
  ? new Date("2026-04-20T00:00:00.000Z")
  : parsedAssessmentCutoff;

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3002")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProd) {
  app.set("trust proxy", 1);
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      role TEXT DEFAULT 'customer'
    )
  `);

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS career_applications (
      id BIGSERIAL PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      linkedin_url TEXT,
      role TEXT,
      message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS intake_submissions (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      age INTEGER NOT NULL,
      chronic_conditions TEXT NOT NULL DEFAULT '[]',
      eyesight_issues BOOLEAN NOT NULL DEFAULT FALSE,
      eye_power TEXT DEFAULT '',
      relation TEXT DEFAULT '',
      diabetes_hba1c TEXT DEFAULT '',
      diabetes_fasting_sugar TEXT DEFAULT '',
      diabetes_medications TEXT DEFAULT '',
      diabetes_on_insulin BOOLEAN,
      diabetes_weight TEXT DEFAULT '',
      diabetes_height TEXT DEFAULT '',
      hypertension_systolic_bp TEXT DEFAULT '',
      hypertension_diastolic_bp TEXT DEFAULT '',
      hypertension_medications TEXT DEFAULT '',
      sleep_medications TEXT DEFAULT '',
      anxiety_medications TEXT DEFAULT '',
      depression_medications TEXT DEFAULT '',
      additional_notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_intake_submissions_phone
    ON intake_submissions (phone)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_intake_submissions_created_at
    ON intake_submissions (created_at DESC)
  `);

  await pool.query(`
    ALTER TABLE intake_submissions
    ADD COLUMN IF NOT EXISTS auth_user_type TEXT
  `);

  await pool.query(`
    ALTER TABLE intake_submissions
    ADD COLUMN IF NOT EXISTS auth_user_id TEXT
  `);

  await pool.query(`
    ALTER TABLE intake_submissions
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ
  `);

  await pool.query(`
    ALTER TABLE intake_submissions
    ADD COLUMN IF NOT EXISTS diabetes_hba1c TEXT DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE intake_submissions
    ADD COLUMN IF NOT EXISTS diabetes_fasting_sugar TEXT DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE intake_submissions
    ADD COLUMN IF NOT EXISTS diabetes_medications TEXT DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE intake_submissions
    ADD COLUMN IF NOT EXISTS diabetes_on_insulin BOOLEAN
  `);

  await pool.query(`
    ALTER TABLE intake_submissions
    ADD COLUMN IF NOT EXISTS diabetes_weight TEXT DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE intake_submissions
    ADD COLUMN IF NOT EXISTS diabetes_height TEXT DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE intake_submissions
    ADD COLUMN IF NOT EXISTS hypertension_systolic_bp TEXT DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE intake_submissions
    ADD COLUMN IF NOT EXISTS hypertension_diastolic_bp TEXT DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE intake_submissions
    ADD COLUMN IF NOT EXISTS hypertension_medications TEXT DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE intake_submissions
    ADD COLUMN IF NOT EXISTS sleep_medications TEXT DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE intake_submissions
    ADD COLUMN IF NOT EXISTS anxiety_medications TEXT DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE intake_submissions
    ADD COLUMN IF NOT EXISTS depression_medications TEXT DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE intake_submissions
    ADD COLUMN IF NOT EXISTS additional_notes TEXT DEFAULT ''
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_intake_submissions_auth_user
    ON intake_submissions (auth_user_type, auth_user_id, created_at DESC)
  `);

  // Table to record historical login events (oauth and phone)
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_usage_sessions (
      id BIGSERIAL PRIMARY KEY,
      lemonslice_session_id TEXT UNIQUE NOT NULL,
      auth_user_type TEXT NOT NULL,
      auth_user_id TEXT NOT NULL,
      submission_id TEXT,
      agent_id TEXT,
      room_url TEXT,
      session_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      session_ended_at TIMESTAMPTZ,
      duration_seconds INTEGER,
      end_reason TEXT,
      meta JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_ai_usage_sessions_started_at
    ON ai_usage_sessions (session_started_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_ai_usage_sessions_auth_user
    ON ai_usage_sessions (auth_user_type, auth_user_id, session_started_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_ai_usage_sessions_agent
    ON ai_usage_sessions (agent_id, session_started_at DESC)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  await pool.query(`
    INSERT INTO settings (key, value) VALUES
      ('fundraising_amount', '1250000'),
      ('waitlist_count', '842'),
      ('centres_count', '40K+'),
      ('tourists_count', '600K'),
      ('providers_count', '4'),
      ('authenticity_pct', '100%'),
      ('phone_user_count', '0')
    ON CONFLICT (key) DO NOTHING
  `);
}

async function incrementPhoneUserCount() {
  await pool.query(
    "INSERT INTO settings (key, value) VALUES ('phone_user_count', '1') ON CONFLICT (key) DO UPDATE SET value = (settings.value::int + 1)::text",
  );
}

async function incrementWaitlistCount() {
  await pool.query(
    "UPDATE settings SET value = (value::int + 1)::text WHERE key = 'waitlist_count'",
  );
}

const getAuthUserType = (user) => {
  return user && user.phone ? "phone" : "oauth";
};

const getAuthUserId = (user) => {
  if (!user || typeof user.id === "undefined" || user.id === null) {
    return null;
  }
  return String(user.id);
};

const AI_USAGE_END_REASONS = new Set([
  "left_meeting",
  "idle_timeout",
  "user_end",
  "unload",
  "error",
  "unknown",
]);

const normalizeAiUsageEndReason = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) return "unknown";
  return AI_USAGE_END_REASONS.has(normalized) ? normalized : "unknown";
};

const getLatestCompletedAssessmentForUser = async (user) => {
  if (!user || user.role === "admin") {
    return null;
  }

  const authUserId = getAuthUserId(user);
  if (!authUserId) {
    return null;
  }

  const authUserType = getAuthUserType(user);
  const result = await pool.query(
    `SELECT id
     FROM intake_submissions
     WHERE auth_user_type = $1
       AND auth_user_id = $2
       AND completed_at IS NOT NULL
       AND completed_at >= $3
     ORDER BY completed_at DESC
     LIMIT 1`,
    [authUserType, authUserId, ASSESSMENT_V2_CUTOFF.toISOString()],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
};

const hasCompletedAssessmentForUser = async (user) => {
  const latest = await getLatestCompletedAssessmentForUser(user);
  return Boolean(latest && latest.id);
};

const getDefaultPostAuthRedirectForUser = async (user) => {
  if (user?.role === "admin") {
    return "/admin.html";
  }

  const hasCompletedAssessment = await hasCompletedAssessmentForUser(user);
  return hasCompletedAssessment
    ? CUSTOMER_CARE_PATH_REDIRECT
    : CUSTOMER_ASSESSMENT_REDIRECT;
};

const resolvePostAuthRedirect = async (value, user) => {
  const fallback = await getDefaultPostAuthRedirectForUser(user);
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.startsWith("/") ? trimmed : fallback;
};

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      try {
        const { hostname } = new URL(origin);
        if (
          hostname === "stillwater.you" ||
          hostname.endsWith(".stillwater.you")
        ) {
          return callback(null, true);
        }
      } catch (err) {
        // If origin is not a valid URL, fall through to rejection.
      }

      return callback(new Error("CORS not allowed"), false);
    },
    credentials: true,
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/favicon.ico", (_req, res) => {
  // Keep browser console clean even when no explicit favicon asset is shipped.
  res.status(204).end();
});

app.get(/^\/wellness-details-(.+)$/, (req, res) => {
  const mobile = encodeURIComponent(String(req.params[0] || "").trim());
  if (!mobile) {
    return res.redirect("/intake.html");
  }
  return res.redirect(`/intake.html?phone=${mobile}`);
});

app.get(/^\/recommendation(?:\/.*)?$/, (_req, res) => {
  return res.redirect("/intake.html");
});

const ALLOWED_CHRONIC_CONDITIONS = new Set([
  "diabetes",
  "hypertension",
  "depression",
  "anxiety",
  "sleep_issues",
  "none_of_the_above",
]);

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return !!value;
};

const LEMONSLICE_API_KEY = String(process.env.LEMONSLICE_API_KEY || "").trim();
const LEMONSLICE_BASE_URL = String(
  process.env.LEMONSLICE_BASE_URL || "https://lemonslice.com/api",
)
  .trim()
  .replace(/\/+$/, "");
const LEMONSLICE_DEFAULT_AGENT_ID = String(
  process.env.LEMONSLICE_AGENT_ID || "agent_6194e41857189803",
).trim();

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || "").trim();
const GEMINI_CHAT_MODEL = String(process.env.GEMINI_CHAT_MODEL || "models/gemini-2.5-flash").trim();
const GEMINI_EMBED_MODEL = String(process.env.GEMINI_EMBED_MODEL || "models/text-embedding-004").trim();
const OPENROUTER_API_KEY = String(process.env.OPENROUTER_API_KEY || "").trim();
const OPENROUTER_BASE_URL = String(process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1")
  .trim()
  .replace(/\/+$/, "");
const OPENROUTER_CHAT_MODEL = String(
  process.env.OPENROUTER_CHAT_MODEL || process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
).trim();
const OPENROUTER_EMBED_MODEL = String(
  process.env.OPENROUTER_EMBED_MODEL || process.env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small",
).trim();
const OPENROUTER_HTTP_REFERER = String(process.env.OPENROUTER_HTTP_REFERER || "").trim();
const OPENROUTER_APP_NAME = String(process.env.OPENROUTER_APP_NAME || "stillwater-rag").trim();
const RAG_LLM_PROVIDER = String(
  process.env.RAG_LLM_PROVIDER || (OPENROUTER_API_KEY && !GEMINI_API_KEY ? "openrouter" : "gemini"),
)
  .trim()
  .toLowerCase();
const TESTIMONIALS_TABLE_DIABETES = String(
  process.env.RAG_TESTIMONIALS_TABLE_DIABETES ||
    process.env.RAG_TESTIMONIALS_TABLE ||
    "testimonials.testimonials_dim_diabetes_amareye",
).trim();
const TESTIMONIALS_TABLE_AMAR_EYE_YOGA = String(
  process.env.RAG_TESTIMONIALS_TABLE_AMAR_EYE_YOGA || "testimonials.testimonials_dim_amareye",
).trim();
const TESTIMONIALS_TABLE_HOLISTIC_WELLNESS = String(
  process.env.RAG_TESTIMONIALS_TABLE_HOLISTIC_WELLNESS ||
    "testimonials.testimonials_dim_sharandiabetes_sharanallotherprogram_amareye",
).trim();
const TESTIMONIALS_TABLE_SHARAN_OTHER_DISEASES = String(
  process.env.RAG_TESTIMONIALS_TABLE_SHARAN_OTHER_DISEASES || "testimonials.testimonials_dim_sharan_other_diseases",
).trim();
const TESTIMONIALS_DATASET_CONFIG = {
  diabetes: {
    table: TESTIMONIALS_TABLE_DIABETES,
    pool,
    dbKey: "primary",
  },
  amar_eye_yoga: {
    table: TESTIMONIALS_TABLE_AMAR_EYE_YOGA,
    pool,
    dbKey: "primary",
  },
  holistic_wellness: {
    table: TESTIMONIALS_TABLE_HOLISTIC_WELLNESS,
    pool,
    dbKey: "primary",
  },
  sharan_other_diseases: {
    table: TESTIMONIALS_TABLE_SHARAN_OTHER_DISEASES,
    pool: sharanRagPool,
    dbKey: "sharan",
  },
};

const normalizeTestimonialsDataset = (rawDataset) => {
  const value = String(rawDataset || "")
    .trim()
    .toLowerCase();

  if (
    ["amar_eye_yoga", "amar-eye-yoga", "amareye", "amareyoga", "eye_yoga", "eye-yoga"].includes(value)
  ) {
    return "amar_eye_yoga";
  }

  if (
    [
      "sharan_other_diseases",
      "sharan-other-diseases",
      "sharan",
      "other_diseases",
      "other-diseases",
    ].includes(value)
  ) {
    return "sharan_other_diseases";
  }

  if (
    [
      "holistic_wellness",
      "holistic-wellness",
      "holistic",
      "wellness",
      "holistic_wellness_ai",
      "holistic-wellness-ai",
    ].includes(value)
  ) {
    return "holistic_wellness";
  }

  return "diabetes";
};

const resolveDatasetConfig = (rawDataset) => {
  const dataset = normalizeTestimonialsDataset(rawDataset);
  const config = TESTIMONIALS_DATASET_CONFIG[dataset] || TESTIMONIALS_DATASET_CONFIG.diabetes;

  if (dataset === "sharan_other_diseases" && !config.pool) {
    throw new Error(
      "RAG_SHARAN_DATABASE_URL is required for sharan_other_diseases dataset.",
    );
  }

  return {
    dataset,
    table: config.table,
    ragPool: config.pool,
    dbKey: config.dbKey,
  };
};

const splitQualifiedTableName = (tableName) => {
  const normalized = String(tableName || "").trim();
  const [first, second] = normalized.split(".");

  if (first && second) {
    return { schema: first.replace(/"/g, ""), table: second.replace(/"/g, "") };
  }

  return { schema: "public", table: normalized.replace(/"/g, "") };
};

const hasEmbeddingColumn = async (targetPool, tableName) => {
  const { schema, table } = splitQualifiedTableName(tableName);
  const result = await targetPool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name = $2
         AND column_name = 'embedding'
     ) AS present`,
    [schema, table],
  );

  return Boolean(result.rows[0] && result.rows[0].present);
};

const buildGeminiApiUrl = (model, action) => {
  return `https://generativelanguage.googleapis.com/v1beta/${model}:${action}?key=${encodeURIComponent(GEMINI_API_KEY)}`;
};

const hasRagProviderConfig = () => {
  if (RAG_LLM_PROVIDER === "openrouter") {
    return Boolean(OPENROUTER_API_KEY);
  }
  return Boolean(GEMINI_API_KEY);
};

const getProviderSummary = () => {
  if (RAG_LLM_PROVIDER === "openrouter") {
    return {
      provider: RAG_LLM_PROVIDER,
      configured: Boolean(OPENROUTER_API_KEY),
      chatModel: OPENROUTER_CHAT_MODEL,
      embedModel: OPENROUTER_EMBED_MODEL,
    };
  }

  return {
    provider: "gemini",
    configured: Boolean(GEMINI_API_KEY),
    chatModel: GEMINI_CHAT_MODEL,
    embedModel: GEMINI_EMBED_MODEL,
  };
};

const buildOpenRouterHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    "X-Title": OPENROUTER_APP_NAME,
  };

  if (OPENROUTER_HTTP_REFERER) {
    headers["HTTP-Referer"] = OPENROUTER_HTTP_REFERER;
  }

  return headers;
};

const toVectorLiteral = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Embedding must be a non-empty numeric array.");
  }
  return `[${values.map((num) => Number(num)).join(",")}]`;
};

const extractGeminiText = (payload) => {
  const candidates = payload && Array.isArray(payload.candidates) ? payload.candidates : [];
  for (const candidate of candidates) {
    const parts =
      candidate && candidate.content && Array.isArray(candidate.content.parts)
        ? candidate.content.parts
        : [];
    const text = parts
      .map((part) => (part && typeof part.text === "string" ? part.text : ""))
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "";
};

async function embedTextWithGemini(text) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const response = await fetch(buildGeminiApiUrl(GEMINI_EMBED_MODEL, "embedContent"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GEMINI_EMBED_MODEL,
      content: {
        parts: [{ text }],
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini embedding request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const values = data && data.embedding && Array.isArray(data.embedding.values) ? data.embedding.values : null;
  if (!values || values.length === 0) {
    throw new Error("Gemini embedding response did not include embedding values.");
  }

  return values;
}

async function embedTextWithOpenRouter(text) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/embeddings`, {
    method: "POST",
    headers: buildOpenRouterHeaders(),
    body: JSON.stringify({
      model: OPENROUTER_EMBED_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter embedding request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const values =
    data && Array.isArray(data.data) && data.data[0] && Array.isArray(data.data[0].embedding)
      ? data.data[0].embedding
      : null;

  if (!values || values.length === 0) {
    throw new Error("OpenRouter embedding response did not include embedding values.");
  }

  return values;
}

async function embedText(text) {
  if (RAG_LLM_PROVIDER === "openrouter") {
    return embedTextWithOpenRouter(text);
  }
  return embedTextWithGemini(text);
}

async function generateRagAnswerWithGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const response = await fetch(buildGeminiApiUrl(GEMINI_CHAT_MODEL, "generateContent"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini generation request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const answer = extractGeminiText(data);
  return answer || "Not found clearly in the testimonials.";
}

async function generateRagAnswerWithOpenRouter(prompt) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: buildOpenRouterHeaders(),
    body: JSON.stringify({
      model: OPENROUTER_CHAT_MODEL,
      temperature: 0.2,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter generation request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const choices = data && Array.isArray(data.choices) ? data.choices : [];
  const answer =
    choices[0] && choices[0].message && typeof choices[0].message.content === "string"
      ? choices[0].message.content.trim()
      : "";

  return answer || "Not found clearly in the testimonials.";
}

async function generateRagAnswer(prompt) {
  if (RAG_LLM_PROVIDER === "openrouter") {
    return generateRagAnswerWithOpenRouter(prompt);
  }
  return generateRagAnswerWithGemini(prompt);
}

// Session Configuration
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "stillwater-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: isProd,
      domain: cookieDomain,
    },
  }),
);

// Passport Configuration
app.use(passport.initialize());
app.use(passport.session());

// Build the OAuth callback URL — use absolute URL in production
const CALLBACK_URL = process.env.BASE_URL
  ? `${process.env.BASE_URL}/auth/google/callback`
  : "/auth/google/callback";

// Avoid crashes if Google OAuth credentials aren't set up yet
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
      },
      async function (accessToken, refreshToken, profile, cb) {
        try {
          const email =
            profile.emails && profile.emails.length > 0
              ? profile.emails[0].value
              : null;
          const userIsAdmin = isAdminEmail(email);

          const existing = await pool.query(
            "SELECT * FROM users WHERE id = $1",
            [profile.id],
          );
          const row = existing.rows[0];

          if (row) {
            if (userIsAdmin && row.role !== "admin") {
              const updated = await pool.query(
                "UPDATE users SET role = 'admin' WHERE id = $1 RETURNING *",
                [profile.id],
              );
              return cb(null, updated.rows[0]);
            }
            return cb(null, row);
          }

          const role = userIsAdmin ? "admin" : "customer";
          const user = {
            id: profile.id,
            name: profile.displayName,
            email: email,
            role: role,
          };

          await pool.query(
            "INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, $4)",
            [user.id, user.name, user.email, user.role],
          );

          await incrementWaitlistCount();

          return cb(null, user);
        } catch (err) {
          return cb(err);
        }
      },
    ),
  );
} else {
  console.warn(
    "WARNING: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. OAuth will not work.",
  );
}

// Passport Local Strategy for Phone/Password Authentication
passport.use(
  new LocalStrategy(
    {
      usernameField: "phone",
      passwordField: "password",
    },
    async (phone, password, done) => {
      try {
        const result = await pool.query(
          "SELECT * FROM users_phone WHERE phone = $1",
          [phone],
        );
        const user = result.rows[0];

        if (!user) {
          return done(null, false, { message: "Phone number not found" });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
          return done(null, false, { message: "Incorrect password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

// Serialize/deserialize for OAuth and phone-based users
passport.serializeUser((user, done) => {
  const type = user && user.phone ? "phone" : "oauth";
  done(null, { id: user.id, type });
});

passport.deserializeUser(async (userWithType, done) => {
  try {
    if (userWithType.type === "phone") {
      const result = await pool.query(
        "SELECT * FROM users_phone WHERE id = $1",
        [userWithType.id],
      );
      return done(null, result.rows[0] || null);
    }

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [
      userWithType.id,
    ]);
    return done(null, result.rows[0] || null);
  } catch (err) {
    return done(err, null);
  }
});

// === RBAC MIDDLEWARE ===

// Check for specific role, preventing access otherwise with a 403 Forbidden.
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.redirect("/auth.html");
    }
    if (req.user.role !== role) {
      return res.status(403).send(`
        <div style="font-family: 'Inter', sans-serif; text-align: center; margin-top: 10rem;">
          <h2 style="color: #031418; font-size: 3rem;">403 Forbidden</h2>
          <p style="color: #666; margin-bottom: 2rem;">You do not have administrative privileges to access The Bridge.</p>
          <a href="/portal.html" style="background:#00E5FF; color:#031418; padding: 1rem 2rem; text-decoration: none; border-radius: 4px; font-weight: 500;">Return to Portal</a>
        </div>
      `);
    }
    next();
  };
};

// Standard login check
const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/auth.html");
  }
  next();
};

const requireAuthApi = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// === PROTECTED ROUTES ===

// These must be defined before express.static so that it intercepts the file delivery
app.get("/admin.html", requireRole("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/assistant.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "assistant.html"));
});

// Route to handle the manual fund update from the Admin dashboard
app.post("/admin/update-funds", requireRole("admin"), async (req, res) => {
  const newAmount = req.body.fundAmount;
  if (!newAmount || isNaN(newAmount)) {
    return res.status(400).send("Invalid fund amount provided.");
  }

  try {
    await pool.query(
      "UPDATE settings SET value = $1 WHERE key = 'fundraising_amount'",
      [newAmount.toString()],
    );
    res.redirect("/admin.html");
  } catch (err) {
    console.error("Failed to update fundraising amount:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Route to handle the manual waitlist count update from the Admin dashboard
app.post("/admin/update-waitlist", requireRole("admin"), async (req, res) => {
  const newCount = req.body.waitlistCount;
  if (!newCount || isNaN(newCount)) {
    return res.status(400).send("Invalid waitlist count provided.");
  }

  try {
    await pool.query(
      "UPDATE settings SET value = $1 WHERE key = 'waitlist_count'",
      [newCount.toString()],
    );
    res.redirect("/admin.html");
  } catch (err) {
    console.error("Failed to update waitlist count:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Route to handle trust indicators update from the Admin dashboard
app.post(
  "/admin/update-trust-stats",
  requireRole("admin"),
  async (req, res) => {
    const { centresCount, touristsCount, providersCount, authenticityPct } =
      req.body;

    if (
      !centresCount ||
      !touristsCount ||
      !providersCount ||
      !authenticityPct
    ) {
      return res.status(400).send("All trust indicator fields are required.");
    }

    try {
      await pool.query(
        "UPDATE settings SET value = $1 WHERE key = 'centres_count'",
        [centresCount],
      );
      await pool.query(
        "UPDATE settings SET value = $1 WHERE key = 'tourists_count'",
        [touristsCount],
      );
      await pool.query(
        "UPDATE settings SET value = $1 WHERE key = 'providers_count'",
        [providersCount],
      );
      await pool.query(
        "UPDATE settings SET value = $1 WHERE key = 'authenticity_pct'",
        [authenticityPct],
      );
      res.redirect("/admin.html");
    } catch (err) {
      console.error("Failed to update trust stats:", err);
      res.status(500).send("Internal Server Error");
    }
  },
);

app.get("/intake.html", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    const returnTo = encodeURIComponent("/intake.html");
    return res.redirect(`/auth.html?returnTo=${returnTo}`);
  }

  try {
    const latestCompleted = await getLatestCompletedAssessmentForUser(req.user);
    if (latestCompleted && latestCompleted.id) {
      return res.redirect(
        `/care-path.html?submissionId=${encodeURIComponent(String(latestCompleted.id))}`,
      );
    }
  } catch (err) {
    console.error("Failed to resolve intake guard redirect:", err);
  }

  return res.sendFile(path.join(__dirname, "intake.html"));
});

app.get("/portal.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "portal.html"));
});

app.get("/testimonials.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "testimonials.html"));
});

app.get("/testimonials-diabetes.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "testimonials-diabetes.html"));
});

app.get("/testimonials-amar-eye-yoga.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "testimonials-amar-eye-yoga.html"));
});

app.get("/testimonials-holistic-wellness.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "testimonials-holistic-wellness.html"));
});

app.get("/testimonials-sharan-other-diseases.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "testimonials-sharan-other-diseases.html"));
});

app.get("/careers.html", (_req, res) => {
  return res.redirect("/testimonials.html");
});

// === API ROUTES ===
app.get("/api/funds", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT value FROM settings WHERE key = 'fundraising_amount'",
    );
    const row = result.rows[0];
    const amount = row ? parseInt(row.value, 10) : 1250000;
    res.json({ amount: amount });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch funds" });
  }
});

app.get("/api/waitlist", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT value FROM settings WHERE key = 'waitlist_count'",
    );
    const row = result.rows[0];
    const count = row ? parseInt(row.value, 10) : 842;
    res.json({ count: count });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch waitlist count" });
  }
});

app.get("/api/trust-stats", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT key, value FROM settings WHERE key IN ('centres_count', 'tourists_count', 'providers_count', 'authenticity_pct')",
    );

    const stats = {
      centres: "40K+",
      tourists: "600K",
      providers: "4",
      authenticity: "100%",
    };

    result.rows.forEach((row) => {
      if (row.key === "centres_count") stats.centres = row.value;
      if (row.key === "tourists_count") stats.tourists = row.value;
      if (row.key === "providers_count") stats.providers = row.value;
      if (row.key === "authenticity_pct") stats.authenticity = row.value;
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trust stats" });
  }
});

app.post("/api/lemonslice/rooms", requireAuthApi, async (req, res) => {
  try {
    if (!LEMONSLICE_API_KEY) {
      return res.status(500).json({
        error: "LemonSlice is not configured on this server.",
      });
    }

    const requestedAgentId = String(req.body?.agentId || "").trim();
    const agentId = requestedAgentId || LEMONSLICE_DEFAULT_AGENT_ID;

    if (!agentId || agentId.length > 120) {
      return res.status(400).json({ error: "A valid LemonSlice agent ID is required." });
    }

    const response = await fetch(`${LEMONSLICE_BASE_URL}/liveai/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": LEMONSLICE_API_KEY,
      },
      body: JSON.stringify({ agent_id: agentId }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const fallbackMessage = `LemonSlice room creation failed (${response.status}).`;
      return res.status(response.status).json({
        error:
          typeof body?.error === "string" && body.error.trim()
            ? body.error
            : fallbackMessage,
      });
    }

    const lemonsliceSessionId = String(body.session_id || "").trim();
    if (!lemonsliceSessionId) {
      return res.status(502).json({
        error: "LemonSlice did not return a valid session ID.",
      });
    }

    const authUserType = getAuthUserType(req.user);
    const authUserId = getAuthUserId(req.user);
    const submissionIdRaw = String(req.body?.submissionId || "").trim();

    let resolvedSubmissionId = submissionIdRaw;

    if (!resolvedSubmissionId) {
      const latestCompleted = await getLatestCompletedAssessmentForUser(req.user);
      resolvedSubmissionId = latestCompleted && latestCompleted.id ? String(latestCompleted.id) : "";
    }

    if (!resolvedSubmissionId) {
      return res.status(400).json({
        error:
          "Complete the intake assessment before starting the AI avatar session.",
      });
    }

    const submissionLookup = await pool.query(
      `SELECT id, name, phone
       FROM intake_submissions
       WHERE id = $1
       LIMIT 1`,
      [resolvedSubmissionId],
    );

    if (submissionLookup.rowCount === 0) {
      return res.status(404).json({
        error: "Assessment submission not found.",
      });
    }

    const submissionId = String(submissionLookup.rows[0].id);

    await pool.query(
      `INSERT INTO ai_usage_sessions (
         lemonslice_session_id,
         auth_user_type,
         auth_user_id,
         submission_id,
         agent_id,
         room_url,
         session_started_at,
         meta
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7::jsonb)
       ON CONFLICT (lemonslice_session_id)
       DO UPDATE SET
         auth_user_type = EXCLUDED.auth_user_type,
         auth_user_id = EXCLUDED.auth_user_id,
         submission_id = EXCLUDED.submission_id,
         agent_id = EXCLUDED.agent_id,
         room_url = EXCLUDED.room_url,
         session_started_at = EXCLUDED.session_started_at,
         meta = EXCLUDED.meta`,
      [
        lemonsliceSessionId,
        authUserType,
        authUserId,
        submissionId,
        agentId,
        body.room_url || null,
        JSON.stringify({
          ip: req.ip || null,
          user_agent: req.get("user-agent") || null,
        }),
      ],
    );

    return res.status(201).json({
      room_url: body.room_url,
      token: body.token,
      image_url: body.image_url,
      session_id: lemonsliceSessionId,
    });
  } catch (err) {
    console.error("Failed to create LemonSlice room:", err);
    return res.status(500).json({ error: "Failed to create LemonSlice room" });
  }
});

app.post("/api/lemonslice/usage/end", requireAuthApi, async (req, res) => {
  try {
    const sessionId = String(req.body?.session_id || "").trim();
    const endReason = normalizeAiUsageEndReason(req.body?.end_reason);

    if (!sessionId || sessionId.length > 200) {
      return res.status(400).json({ error: "A valid session_id is required." });
    }

    const authUserType = getAuthUserType(req.user);
    const authUserId = getAuthUserId(req.user);

    const updateResult = await pool.query(
      `UPDATE ai_usage_sessions
       SET session_ended_at = NOW(),
           duration_seconds = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - session_started_at)))::INT),
           end_reason = $4
       WHERE lemonslice_session_id = $1
         AND auth_user_type = $2
         AND auth_user_id = $3
         AND session_ended_at IS NULL
       RETURNING lemonslice_session_id, session_started_at, session_ended_at, duration_seconds, end_reason`,
      [sessionId, authUserType, authUserId, endReason],
    );

    if (updateResult.rowCount > 0) {
      return res.json({
        ok: true,
        ended: true,
        item: updateResult.rows[0],
      });
    }

    const existing = await pool.query(
      `SELECT lemonslice_session_id, session_started_at, session_ended_at, duration_seconds, end_reason
       FROM ai_usage_sessions
       WHERE lemonslice_session_id = $1
         AND auth_user_type = $2
         AND auth_user_id = $3
       LIMIT 1`,
      [sessionId, authUserType, authUserId],
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Session not found for current user." });
    }

    return res.json({
      ok: true,
      ended: false,
      alreadyEnded: true,
      item: existing.rows[0],
    });
  } catch (err) {
    console.error("Failed to end LemonSlice usage session:", err);
    return res.status(500).json({ error: "Failed to end LemonSlice usage session" });
  }
});

app.post("/api/careers/apply", async (req, res) => {
  const { firstName, lastName, email, linkedinUrl, role, message } = req.body;

  if (!firstName || !lastName || !email || !role) {
    return res
      .status(400)
      .json({ error: "First name, last name, email, and role are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO career_applications (first_name, last_name, email, linkedin_url, role, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [firstName, lastName, email, linkedinUrl, role, message],
    );
    res.status(201).json({
      success: true,
      message: "Application submitted successfully.",
      id: result.rows[0].id,
    });
  } catch (err) {
    console.error("Error saving career application:", err.message);
    res
      .status(500)
      .json({ error: "Failed to submit application. Please try again later." });
  }
});

app.get("/api/admin/careers", requireRole("admin"), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM career_applications ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching career applications:", err.message);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

app.get("/api/admin/phone-users", requireRole("admin"), async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, phone, name, role, created_at FROM users_phone ORDER BY created_at DESC",
    );

    res.json({
      count: result.rowCount,
      users: result.rows,
    });
  } catch (err) {
    console.error("Error fetching phone users:", err.message);
    res.status(500).json({ error: "Failed to fetch phone users" });
  }
});

// Admin: fetch login events (historical)
app.get("/api/admin/logins", requireRole("admin"), async (req, res) => {
  try {
    const limitRaw = parseInt(String(req.query.limit || "100"), 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(limitRaw, 1000))
      : 100;
    const offsetRaw = parseInt(String(req.query.offset || "0"), 10);
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;

    const method = req.query.method ? String(req.query.method).trim() : null;
    const userId = req.query.user_id ? String(req.query.user_id).trim() : null;
    const from = req.query.from ? String(req.query.from).trim() : null;
    const to = req.query.to ? String(req.query.to).trim() : null;

    const params = [];
    const where = [];
    if (method) {
      params.push(method);
      where.push(`method = $${params.length}`);
    }
    if (userId) {
      params.push(userId);
      where.push(`user_id = $${params.length}`);
    }
    if (from) {
      params.push(from);
      where.push(`created_at >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      where.push(`created_at <= $${params.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countParams = params.slice();

    const limitPos = params.length + 1;
    const offsetPos = params.length + 2;
    params.push(limit);
    params.push(offset);

    const rowsResult = await pool.query(
      `SELECT * FROM login_events ${whereClause} ORDER BY created_at DESC LIMIT $${limitPos} OFFSET $${offsetPos}`,
      params,
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM login_events ${whereClause}`,
      countParams,
    );

    res.json({
      count: parseInt(countResult.rows[0].count, 10),
      items: rowsResult.rows,
    });
  } catch (err) {
    console.error("Error fetching login events:", err.message || err);
    res.status(500).json({ error: "Failed to fetch login events" });
  }
});

app.get("/api/admin/ai-usage", requireRole("admin"), async (req, res) => {
  try {
    const limitRaw = parseInt(String(req.query.limit || "100"), 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(limitRaw, 1000))
      : 100;
    const offsetRaw = parseInt(String(req.query.offset || "0"), 10);
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;
    const submissionOnly =
      String(req.query.submission_only || req.query.submissionOnly || "")
        .trim()
        .toLowerCase() === "true" ||
      String(req.query.submission_only || req.query.submissionOnly || "") === "1";

    const userType = req.query.user_type ? String(req.query.user_type).trim() : null;
    const userId = req.query.user_id ? String(req.query.user_id).trim() : null;
    const agentId = req.query.agent_id ? String(req.query.agent_id).trim() : null;
    const from = req.query.from ? String(req.query.from).trim() : null;
    const to = req.query.to ? String(req.query.to).trim() : null;

    const baseParams = [];
    const where = [];

    if (userType) {
      baseParams.push(userType);
      where.push(`auth_user_type = $${baseParams.length}`);
    }
    if (userId) {
      baseParams.push(userId);
      where.push(`auth_user_id = $${baseParams.length}`);
    }
    if (agentId) {
      baseParams.push(agentId);
      where.push(`agent_id = $${baseParams.length}`);
    }
    if (from) {
      baseParams.push(from);
      where.push(`session_started_at >= $${baseParams.length}`);
    }
    if (to) {
      baseParams.push(to);
      where.push(`session_started_at <= $${baseParams.length}`);
    }
    if (submissionOnly) {
      where.push(`submission_id IS NOT NULL AND submission_id <> ''`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const rowsParams = baseParams.slice();
    const limitPos = rowsParams.length + 1;
    const offsetPos = rowsParams.length + 2;
    rowsParams.push(limit, offset);

    const aiWhereClause = where.length
      ? `WHERE ${where.map((clause) => clause.replace(/\bauth_user_type\b/g, "ai.auth_user_type").replace(/\bauth_user_id\b/g, "ai.auth_user_id").replace(/\bagent_id\b/g, "ai.agent_id").replace(/\bsession_started_at\b/g, "ai.session_started_at").replace(/\bsubmission_id\b/g, "ai.submission_id")).join(" AND ")}`
      : "";

    const rowsResult = await pool.query(
      `SELECT
         ai.id,
         ai.lemonslice_session_id,
         ai.auth_user_type,
         ai.auth_user_id,
         ai.submission_id,
         intake.name AS submission_name,
         intake.phone AS submission_phone,
         u.email AS auth_user_email,
         ai.agent_id,
         ai.session_started_at,
         ai.session_ended_at,
         ai.duration_seconds,
         ai.end_reason,
         ai.created_at
       FROM ai_usage_sessions ai
       LEFT JOIN intake_submissions intake
         ON intake.id::text = ai.submission_id
       LEFT JOIN users u
         ON ai.auth_user_type = 'oauth' AND u.id = ai.auth_user_id
       ${aiWhereClause}
       ORDER BY ai.session_started_at DESC
       LIMIT $${limitPos} OFFSET $${offsetPos}`,
      rowsParams,
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM ai_usage_sessions ai ${aiWhereClause}`,
      baseParams,
    );

    const summaryResult = await pool.query(
      `SELECT
         COUNT(*)::int AS total_sessions,
         COALESCE(SUM(ai.duration_seconds), 0)::int AS total_duration_seconds,
         COALESCE(AVG(ai.duration_seconds), 0)::float8 AS avg_duration_seconds,
         COUNT(DISTINCT ai.auth_user_type || ':' || ai.auth_user_id)::int AS distinct_users
       FROM ai_usage_sessions ai
       ${aiWhereClause}`,
      baseParams,
    );

    return res.json({
      count: countResult.rows[0]?.total || 0,
      items: rowsResult.rows,
      summary: {
        total_sessions: summaryResult.rows[0]?.total_sessions || 0,
        total_duration_seconds: summaryResult.rows[0]?.total_duration_seconds || 0,
        avg_duration_seconds: summaryResult.rows[0]?.avg_duration_seconds || 0,
        distinct_users: summaryResult.rows[0]?.distinct_users || 0,
      },
    });
  } catch (err) {
    console.error("Error fetching AI usage sessions:", err.message || err);
    return res.status(500).json({ error: "Failed to fetch AI usage sessions" });
  }
});

app.get("/api/admin/ai-avatar-usage", requireRole("admin"), async (req, res) => {
  try {
    const limitRaw = parseInt(String(req.query.limit || "100"), 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(limitRaw, 500))
      : 100;
    const offsetRaw = parseInt(String(req.query.offset || "0"), 10);
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM ai_usage_sessions ai
       INNER JOIN intake_submissions intake
         ON intake.id::text = ai.submission_id`,
    );

    const rowsResult = await pool.query(
      `SELECT
         ai.id,
         ai.lemonslice_session_id,
         ai.submission_id,
         intake.name AS submission_name,
         intake.phone AS submission_phone,
         ai.agent_id,
         ai.session_started_at,
         ai.session_ended_at,
         COALESCE(
           ai.duration_seconds,
           GREATEST(
             0,
             FLOOR(EXTRACT(EPOCH FROM (COALESCE(ai.session_ended_at, NOW()) - ai.session_started_at)))::INT
           )
         ) AS duration_seconds,
         ai.end_reason
       FROM ai_usage_sessions ai
       INNER JOIN intake_submissions intake
         ON intake.id::text = ai.submission_id
       ORDER BY ai.session_started_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    return res.json({
      count: countResult.rows[0]?.total || 0,
      items: rowsResult.rows,
    });
  } catch (err) {
    console.error("Error fetching AI avatar usage sessions:", err.message || err);
    return res.status(500).json({ error: "Failed to fetch AI avatar usage sessions" });
  }
});

// Admin: export phone users as CSV
app.get(
  "/api/admin/export/phone-users",
  requireRole("admin"),
  async (_req, res) => {
    try {
      const result = await pool.query(
        "SELECT id, phone, name, role, created_at FROM users_phone ORDER BY created_at DESC",
      );

      const rows = result.rows || [];

      const headers = ["id", "phone", "name", "role", "created_at"];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="phone-users.csv"',
      );

      const escape = (val) => {
        if (val === null || typeof val === "undefined") return "";
        return '"' + String(val).replace(/"/g, '""') + '"';
      };

      let out = headers.join(",") + "\n";
      rows.forEach((r) => {
        out +=
          [r.id, r.phone, r.name, r.role, r.created_at]
            .map(escape)
            .join(",") +
          "\n";
      });

      res.send(out);
    } catch (err) {
      console.error("Error exporting phone users:", err);
      res.status(500).send("Failed to export phone users");
    }
  },
);

// Admin: export login events as CSV
app.get(
  "/api/admin/export/logins",
  requireRole("admin"),
  async (_req, res) => {
    try {
      const result = await pool.query(
        "SELECT id, user_id, user_type, identifier, method, ip, user_agent, meta, created_at FROM login_events ORDER BY created_at DESC",
      );

      const rows = result.rows || [];
      const headers = [
        "id",
        "user_id",
        "user_type",
        "identifier",
        "method",
        "ip",
        "user_agent",
        "meta",
        "created_at",
      ];

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="login-events.csv"',
      );

      const escape = (val) => {
        if (val === null || typeof val === "undefined") return "";
        let s = typeof val === "object" ? JSON.stringify(val) : String(val);
        return '"' + s.replace(/"/g, '""') + '"';
      };

      let out = headers.join(",") + "\n";
      rows.forEach((r) => {
        out +=
          [
            r.id,
            r.user_id,
            r.user_type,
            r.identifier,
            r.method,
            r.ip,
            r.user_agent,
            r.meta,
            r.created_at,
          ]
            .map(escape)
            .join(",") +
          "\n";
      });

      res.send(out);
    } catch (err) {
      console.error("Error exporting login events:", err);
      res.status(500).send("Failed to export login events");
    }
  },
);

// Admin: export AI usage sessions as CSV
app.get(
  "/api/admin/export/ai-usage",
  requireRole("admin"),
  async (req, res) => {
    try {
      const userType = req.query.user_type ? String(req.query.user_type).trim() : null;
      const userId = req.query.user_id ? String(req.query.user_id).trim() : null;
      const agentId = req.query.agent_id ? String(req.query.agent_id).trim() : null;
      const from = req.query.from ? String(req.query.from).trim() : null;
      const to = req.query.to ? String(req.query.to).trim() : null;

      const params = [];
      const where = [];

      if (userType) {
        params.push(userType);
        where.push(`auth_user_type = $${params.length}`);
      }
      if (userId) {
        params.push(userId);
        where.push(`auth_user_id = $${params.length}`);
      }
      if (agentId) {
        params.push(agentId);
        where.push(`agent_id = $${params.length}`);
      }
      if (from) {
        params.push(from);
        where.push(`session_started_at >= $${params.length}`);
      }
      if (to) {
        params.push(to);
        where.push(`session_started_at <= $${params.length}`);
      }

      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const result = await pool.query(
        `SELECT
           id,
           lemonslice_session_id,
           auth_user_type,
           auth_user_id,
           submission_id,
           agent_id,
           session_started_at,
           session_ended_at,
           duration_seconds,
           end_reason,
           created_at
         FROM ai_usage_sessions
         ${whereClause}
         ORDER BY session_started_at DESC`,
        params,
      );

      const rows = result.rows || [];
      const headers = [
        "id",
        "lemonslice_session_id",
        "auth_user_type",
        "auth_user_id",
        "submission_id",
        "agent_id",
        "session_started_at",
        "session_ended_at",
        "duration_seconds",
        "end_reason",
        "created_at",
      ];

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="ai-usage-sessions.csv"',
      );

      const escape = (val) => {
        if (val === null || typeof val === "undefined") return "";
        return '"' + String(val).replace(/"/g, '""') + '"';
      };

      let out = headers.join(",") + "\n";
      rows.forEach((r) => {
        out +=
          [
            r.id,
            r.lemonslice_session_id,
            r.auth_user_type,
            r.auth_user_id,
            r.submission_id,
            r.agent_id,
            r.session_started_at,
            r.session_ended_at,
            r.duration_seconds,
            r.end_reason,
            r.created_at,
          ]
            .map(escape)
            .join(",") +
          "\n";
      });

      return res.send(out);
    } catch (err) {
      console.error("Error exporting AI usage sessions:", err);
      return res.status(500).send("Failed to export AI usage sessions");
    }
  },
);

app.get("/api/rag/status", async (_req, res) => {
  try {
    const { dataset, table, ragPool, dbKey } = resolveDatasetConfig(_req.query?.dataset);
    const embeddingPresent = await hasEmbeddingColumn(ragPool, table);
    const stats = embeddingPresent
      ? await ragPool.query(
          `SELECT
             COUNT(*)::int AS total_rows,
             COUNT(*) FILTER (WHERE embedding IS NOT NULL)::int AS embedded_rows
           FROM ${table}`,
        )
      : await ragPool.query(
          `SELECT
             COUNT(*)::int AS total_rows,
             0::int AS embedded_rows
           FROM ${table}`,
        );

    const providerSummary = getProviderSummary();

    return res.json({
      ok: true,
      dataset,
      table,
      db: dbKey,
      retrievalMode: embeddingPresent ? "vector" : "text",
      provider: providerSummary.provider,
      configured: providerSummary.configured,
      chatModel: providerSummary.chatModel,
      embedModel: providerSummary.embedModel,
      counts: stats.rows[0],
    });
  } catch (err) {
    console.error("Failed to fetch RAG status:", err);
    return res.status(500).json({
      ok: false,
      table: TESTIMONIALS_TABLE_DIABETES,
      error: "Failed to fetch RAG status",
      details: err.message,
    });
  }
});

app.post("/api/rag/chat", requireAuthApi, async (req, res) => {
  try {
    const query = String(req.body?.query || "").trim();
    const language = String(req.body?.language || "en").trim().toLowerCase();
    const { dataset, table, ragPool } = resolveDatasetConfig(req.body?.dataset);
    const topKRaw = Number.parseInt(String(req.body?.topK || "3"), 10);
    const topK = Number.isInteger(topKRaw) ? Math.max(1, Math.min(topKRaw, 5)) : 3;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    if (!hasRagProviderConfig()) {
      return res.status(500).json({
        error: `RAG provider credentials are missing for provider: ${RAG_LLM_PROVIDER}`,
      });
    }

    const embeddingPresent = await hasEmbeddingColumn(ragPool, table);
    const retrieval = embeddingPresent
      ? await (async () => {
          const queryEmbedding = await embedText(query);
          const vectorLiteral = toVectorLiteral(queryEmbedding);

          return ragPool.query(
            `SELECT
               title,
               url,
               testimonial,
               1 - (embedding <=> $1::vector) AS score
             FROM ${table}
             WHERE embedding IS NOT NULL
             ORDER BY embedding <=> $1::vector
             LIMIT $2`,
            [vectorLiteral, topK],
          );
        })()
      : await ragPool.query(
          `SELECT
             title,
             url,
             testimonial,
             NULL::double precision AS score
           FROM ${table}
           ORDER BY
             CASE
               WHEN LOWER(COALESCE(testimonial, '')) LIKE LOWER($1)
                 OR LOWER(COALESCE(title, '')) LIKE LOWER($1)
               THEN 0
               ELSE 1
             END,
             LENGTH(COALESCE(testimonial, '')) DESC
           LIMIT $2`,
          [`%${query}%`, topK],
        );

    const rows = retrieval.rows || [];
    if (!rows.length) {
      return res.json({
        query,
        dataset,
        answer:
          "I could not find matching embedded testimonials yet. Please run embedding backfill first.",
        sources: [],
      });
    }

    const languageInstruction = language === "hi" ? "Answer in Hindi." : "Answer in English.";

    const context = rows
      .map((row, idx) => {
        return `SOURCE ${idx + 1}\nTITLE: ${row.title || ""}\nURL: ${row.url || ""}\nTESTIMONIAL:\n${row.testimonial || ""}`;
      })
      .join("\n\n");

    const prompt = `You are a testimonial-based assistant.

Rules:
1. Answer only from the provided testimonial context.
2. If not found, say: "Not found clearly in the testimonials."
3. Do not give medical advice.
4. Mention source title and URL.
5. Keep answer short.
6. ${languageInstruction}

User question:
${query}

Context:
${context}`;

    const answer = await generateRagAnswer(prompt);

    return res.json({
      query,
      dataset,
      retrievalMode: embeddingPresent ? "vector" : "text",
      answer,
      sources: rows.map((row) => ({
        title: row.title || "",
        url: row.url || "",
        score: Number(row.score),
      })),
    });
  } catch (err) {
    console.error("RAG chat failed:", err);
    return res.status(500).json({ error: "RAG chat failed", details: err.message });
  }
});

app.get("/api/auth/me", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.json({ authenticated: false });
  }

  let redirectUrl = "/admin.html";
  let hasCompletedAssessment = false;
  let latestSubmissionId = null;
  try {
    const latestCompletedAssessment = await getLatestCompletedAssessmentForUser(req.user);
    hasCompletedAssessment = Boolean(
      latestCompletedAssessment && latestCompletedAssessment.id,
    );
    latestSubmissionId = hasCompletedAssessment
      ? String(latestCompletedAssessment.id)
      : null;
    redirectUrl = await getDefaultPostAuthRedirectForUser(req.user);
  } catch (err) {
    console.error("Failed to compute auth/me redirect or assessment status:", err);
  }

  res.json({
    authenticated: true,
    id: req.user.id,
    name: req.user.name || req.user.phone || "User",
    email: req.user.email,
    role: req.user.role,
    redirectUrl,
    hasCompletedAssessment,
    latestSubmissionId,
  });
});

app.post("/api/intake-submissions", async (req, res) => {
  try {
    const {
      name,
      phone,
      age,
      chronicConditions,
      eyesightIssues,
      eyePower,
      relation,
      isFamilyMember,
      diabetesHba1c,
      diabetesFastingSugar,
      diabetesMedications,
      diabetesOnInsulin,
      diabetesWeight,
      diabetesHeight,
      hypertensionSystolicBp,
      hypertensionDiastolicBp,
      hypertensionMedications,
      sleepMedications,
      anxietyMedications,
      depressionMedications,
      additionalNotes,
    } = req.body || {};

    const cleanName = String(name || "").trim();
    const cleanPhone = String(phone || "")
      .replace(/\s+/g, "")
      .trim();
    const parsedAge = parseInt(String(age || ""), 10);
    const isForFamilyMember = toBoolean(isFamilyMember);
    const relationText = String(relation || "").trim();
    const hasEyesightIssues = toBoolean(eyesightIssues);
    const cleanEyePower = String(eyePower || "").trim();
    const cleanAdditionalNotes = String(additionalNotes || "").trim();
    const isAuthenticated = req.isAuthenticated && req.isAuthenticated();
    const authUserType = isAuthenticated ? getAuthUserType(req.user) : null;
    const authUserId = isAuthenticated ? getAuthUserId(req.user) : null;
    const completedAt = isAuthenticated ? new Date().toISOString() : null;

    const normalizeNumberString = (value) => {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "";
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) return "";
      return trimmed;
    };

    if (!cleanName || cleanName.length > 120) {
      return res
        .status(400)
        .json({ error: "Name is required and must be under 120 characters." });
    }

    if (!cleanPhone || cleanPhone.length < 8 || cleanPhone.length > 20) {
      return res.status(400).json({ error: "Valid phone number is required." });
    }

    if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      return res
        .status(400)
        .json({ error: "Age must be a number between 1 and 120." });
    }

    const conditionsInput = Array.isArray(chronicConditions)
      ? chronicConditions
      : typeof chronicConditions === "string" && chronicConditions.trim()
        ? [chronicConditions]
        : [];

    let normalizedConditions = conditionsInput
      .map((item) => String(item).trim().toLowerCase())
      .filter(Boolean);

    const hasInvalidCondition = normalizedConditions.some(
      (condition) => !ALLOWED_CHRONIC_CONDITIONS.has(condition),
    );

    if (hasInvalidCondition) {
      return res
        .status(400)
        .json({ error: "One or more chronic conditions are invalid." });
    }

    if (normalizedConditions.includes("none_of_the_above")) {
      normalizedConditions = ["none_of_the_above"];
    }

    const hasDiabetes = normalizedConditions.includes("diabetes");
    const hasHypertension = normalizedConditions.includes("hypertension");
    const hasSleepIssues = normalizedConditions.includes("sleep_issues");
    const hasAnxiety = normalizedConditions.includes("anxiety");
    const hasDepression = normalizedConditions.includes("depression");

    const cleanDiabetesHba1c = normalizeNumberString(diabetesHba1c);
    const cleanDiabetesFasting = normalizeNumberString(diabetesFastingSugar);
    const cleanDiabetesMedications = String(diabetesMedications || "").trim();
    const diabetesOnInsulinProvided =
      typeof diabetesOnInsulin !== "undefined" &&
      String(diabetesOnInsulin).trim() !== "";
    const cleanDiabetesOnInsulin = diabetesOnInsulinProvided
      ? toBoolean(diabetesOnInsulin)
      : null;
    const cleanDiabetesWeight = normalizeNumberString(diabetesWeight);
    const cleanDiabetesHeight = normalizeNumberString(diabetesHeight);

    const cleanHypertensionSystolic = normalizeNumberString(hypertensionSystolicBp);
    const cleanHypertensionDiastolic = normalizeNumberString(hypertensionDiastolicBp);
    const cleanHypertensionMedications = String(hypertensionMedications || "").trim();

    const cleanSleepMedications = String(sleepMedications || "").trim();
    const cleanAnxietyMedications = String(anxietyMedications || "").trim();
    const cleanDepressionMedications = String(depressionMedications || "").trim();

    if (cleanAdditionalNotes.length > 1500) {
      return res
        .status(400)
        .json({ error: "Additional notes must be 1500 characters or fewer." });
    }

    if (isForFamilyMember && !relationText) {
      return res.status(400).json({
        error: "Relation is required when filling for a family member.",
      });
    }

    if (hasEyesightIssues && !cleanEyePower) {
      return res.status(400).json({
        error: "Please provide eye power when eyesight issues are selected.",
      });
    }

    if (hasDiabetes) {
      if (!cleanDiabetesHba1c) {
        return res.status(400).json({
          error: "HbA1c is required when diabetes is selected.",
        });
      }
      if (!cleanDiabetesFasting) {
        return res.status(400).json({
          error: "Fasting sugar level is required when diabetes is selected.",
        });
      }
      if (!cleanDiabetesMedications) {
        return res.status(400).json({
          error: "Diabetes medications are required when diabetes is selected.",
        });
      }
      if (!diabetesOnInsulinProvided) {
        return res.status(400).json({
          error: "Please specify whether insulin is taken when diabetes is selected.",
        });
      }
      if (!cleanDiabetesWeight || !cleanDiabetesHeight) {
        return res.status(400).json({
          error: "Weight and height are required when diabetes is selected.",
        });
      }
    }

    if (hasHypertension) {
      if (!cleanHypertensionSystolic || !cleanHypertensionDiastolic) {
        return res.status(400).json({
          error: "Systolic and diastolic BP are required when hypertension is selected.",
        });
      }
      if (!cleanHypertensionMedications) {
        return res.status(400).json({
          error: "Hypertension medications are required when hypertension is selected.",
        });
      }
    }

    if (hasSleepIssues && !cleanSleepMedications) {
      return res.status(400).json({
        error: "Sleep medication details are required when sleep issues are selected.",
      });
    }

    if (hasAnxiety && !cleanAnxietyMedications) {
      return res.status(400).json({
        error: "Anxiety medication details are required when anxiety is selected.",
      });
    }

    if (hasDepression && !cleanDepressionMedications) {
      return res.status(400).json({
        error: "Depression medication details are required when depression is selected.",
      });
    }

    const insertDiabetesHba1c = hasDiabetes ? cleanDiabetesHba1c : "";
    const insertDiabetesFasting = hasDiabetes ? cleanDiabetesFasting : "";
    const insertDiabetesMedications = hasDiabetes ? cleanDiabetesMedications : "";
    const insertDiabetesOnInsulin = hasDiabetes ? cleanDiabetesOnInsulin : null;
    const insertDiabetesWeight = hasDiabetes ? cleanDiabetesWeight : "";
    const insertDiabetesHeight = hasDiabetes ? cleanDiabetesHeight : "";
    const insertHypertensionSystolic = hasHypertension ? cleanHypertensionSystolic : "";
    const insertHypertensionDiastolic = hasHypertension ? cleanHypertensionDiastolic : "";
    const insertHypertensionMedications = hasHypertension ? cleanHypertensionMedications : "";
    const insertSleepMedications = hasSleepIssues ? cleanSleepMedications : "";
    const insertAnxietyMedications = hasAnxiety ? cleanAnxietyMedications : "";
    const insertDepressionMedications = hasDepression ? cleanDepressionMedications : "";

    const result = await pool.query(
      `INSERT INTO intake_submissions
      (name, phone, age, chronic_conditions, eyesight_issues, eye_power, relation, diabetes_hba1c, diabetes_fasting_sugar, diabetes_medications, diabetes_on_insulin, diabetes_weight, diabetes_height, hypertension_systolic_bp, hypertension_diastolic_bp, hypertension_medications, sleep_medications, anxiety_medications, depression_medications, additional_notes, auth_user_type, auth_user_id, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING id, created_at`,
      [
        cleanName,
        cleanPhone,
        parsedAge,
        JSON.stringify(normalizedConditions),
        hasEyesightIssues,
        cleanEyePower,
        isForFamilyMember ? relationText : "self",
        insertDiabetesHba1c,
        insertDiabetesFasting,
        insertDiabetesMedications,
        insertDiabetesOnInsulin,
        insertDiabetesWeight,
        insertDiabetesHeight,
        insertHypertensionSystolic,
        insertHypertensionDiastolic,
        insertHypertensionMedications,
        insertSleepMedications,
        insertAnxietyMedications,
        insertDepressionMedications,
        cleanAdditionalNotes,
        authUserType,
        authUserId,
        completedAt,
      ],
    );

    return res.status(201).json({
      success: true,
      submissionId: result.rows[0].id,
      createdAt: result.rows[0].created_at,
    });
  } catch (err) {
    console.error("Failed to save intake submission:", err);
    return res.status(500).json({ error: "Failed to save intake submission" });
  }
});

app.get(
  "/api/admin/intake-submissions",
  requireRole("admin"),
  async (req, res) => {
    try {
      const phoneFilter = String(req.query.phone || "").trim();
      const searchFilter = String(req.query.q || req.query.query || "").trim();
      const limitRaw = parseInt(String(req.query.limit || "100"), 10);
      const limit = Number.isFinite(limitRaw)
        ? Math.max(1, Math.min(limitRaw, 500))
        : 100;

      const params = [];
      const whereParts = [];
      if (phoneFilter) {
        params.push(phoneFilter);
        whereParts.push(`phone = $${params.length}`);
      }

      if (searchFilter) {
        params.push(`%${searchFilter}%`);
        const searchParam = `$${params.length}`;
        whereParts.push(`(
          CAST(id AS TEXT) ILIKE ${searchParam}
          OR name ILIKE ${searchParam}
          OR phone ILIKE ${searchParam}
          OR CAST(age AS TEXT) ILIKE ${searchParam}
          OR relation ILIKE ${searchParam}
          OR eye_power ILIKE ${searchParam}
          OR chronic_conditions ILIKE ${searchParam}
          OR diabetes_hba1c ILIKE ${searchParam}
          OR diabetes_fasting_sugar ILIKE ${searchParam}
          OR diabetes_medications ILIKE ${searchParam}
          OR CAST(diabetes_on_insulin AS TEXT) ILIKE ${searchParam}
          OR diabetes_weight ILIKE ${searchParam}
          OR diabetes_height ILIKE ${searchParam}
          OR hypertension_systolic_bp ILIKE ${searchParam}
          OR hypertension_diastolic_bp ILIKE ${searchParam}
          OR hypertension_medications ILIKE ${searchParam}
          OR sleep_medications ILIKE ${searchParam}
          OR anxiety_medications ILIKE ${searchParam}
          OR depression_medications ILIKE ${searchParam}
          OR additional_notes ILIKE ${searchParam}
        )`);
      }

      params.push(limit);
      const whereClause = whereParts.length
        ? `WHERE ${whereParts.join(" AND ")}`
        : "";

      const result = await pool.query(
        `SELECT id, name, phone, age, chronic_conditions, eyesight_issues, eye_power, relation, diabetes_hba1c, diabetes_fasting_sugar, diabetes_medications, diabetes_on_insulin, diabetes_weight, diabetes_height, hypertension_systolic_bp, hypertension_diastolic_bp, hypertension_medications, sleep_medications, anxiety_medications, depression_medications, additional_notes, auth_user_type, auth_user_id, completed_at, created_at
       FROM intake_submissions
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
        params,
      );

      return res.json({ count: result.rowCount, items: result.rows });
    } catch (err) {
      console.error("Failed to fetch intake submissions:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch intake submissions" });
    }
  },
);

app.get(
  "/api/admin/intake-submissions/:id",
  requireRole("admin"),
  async (req, res) => {
    try {
      const submissionId = parseInt(String(req.params.id || ""), 10);
      if (!Number.isInteger(submissionId) || submissionId < 1) {
        return res.status(400).json({ error: "Valid submission id is required" });
      }

      const submissionResult = await pool.query(
        `SELECT id, name, phone, age, chronic_conditions, eyesight_issues, eye_power, relation, diabetes_hba1c, diabetes_fasting_sugar, diabetes_medications, diabetes_on_insulin, diabetes_weight, diabetes_height, hypertension_systolic_bp, hypertension_diastolic_bp, hypertension_medications, sleep_medications, anxiety_medications, depression_medications, additional_notes, auth_user_type, auth_user_id, completed_at, created_at
         FROM intake_submissions
         WHERE id = $1
         LIMIT 1`,
        [submissionId],
      );

      const item = submissionResult.rows[0] || null;
      if (!item) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const historyResult = await pool.query(
        `SELECT id, name, phone, age, chronic_conditions, eyesight_issues, eye_power, relation, diabetes_hba1c, diabetes_fasting_sugar, diabetes_medications, diabetes_on_insulin, diabetes_weight, diabetes_height, hypertension_systolic_bp, hypertension_diastolic_bp, hypertension_medications, sleep_medications, anxiety_medications, depression_medications, additional_notes, auth_user_type, auth_user_id, completed_at, created_at
         FROM intake_submissions
         WHERE phone = $1
         ORDER BY created_at DESC
         LIMIT 12`,
        [item.phone],
      );

      let linkedUser = null;
      if (item.auth_user_type === "phone" && item.auth_user_id) {
        const userResult = await pool.query(
          `SELECT id, name, phone, role, created_at
           FROM users_phone
           WHERE id = $1
           LIMIT 1`,
          [item.auth_user_id],
        );
        if (userResult.rows[0]) {
          linkedUser = { type: "phone", ...userResult.rows[0] };
        }
      } else if (item.auth_user_type === "oauth" && item.auth_user_id) {
        const userResult = await pool.query(
          `SELECT id, name, email, role
           FROM users
           WHERE id = $1
           LIMIT 1`,
          [item.auth_user_id],
        );
        if (userResult.rows[0]) {
          linkedUser = { type: "oauth", ...userResult.rows[0] };
        }
      }

      const aiUsageResult = await pool.query(
        `SELECT id, lemonslice_session_id, auth_user_type, auth_user_id, submission_id, agent_id, room_url, session_started_at, session_ended_at, duration_seconds, end_reason
         FROM ai_usage_sessions
         WHERE submission_id = $1::text
            OR (auth_user_type = $2 AND auth_user_id = $3)
         ORDER BY session_started_at DESC
         LIMIT 8`,
        [String(item.id), item.auth_user_type, item.auth_user_id],
      );

      return res.json({
        item,
        linkedUser,
        history: historyResult.rows,
        aiUsage: aiUsageResult.rows,
      });
    } catch (err) {
      console.error("Failed to fetch intake submission detail:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch intake submission detail" });
    }
  },
);

// === STATIC & PUBLIC ROUTES ===

// Intercept intake page access to prevent duplicate submissions
app.get(['/intake.html', '/intake'], async (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    try {
      const latestCompleted = await getLatestCompletedAssessmentForUser(req.user);
      if (latestCompleted && latestCompleted.id) {
        return res.redirect(`/care-path.html?submissionId=${encodeURIComponent(String(latestCompleted.id))}`);
      }
    } catch (err) {
      console.error("Error checking assessment status for intercept:", err);
    }
  }
  next();
});

// Serve Static Assets (HTML/CSS/JS/Images)
app.use(express.static(path.join(__dirname)));

// Fallback for root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Google OAuth Login Route
app.get(
  "/auth/google",
  (req, res, next) => {
    if (req.query.returnTo) {
      req.session.returnTo = req.query.returnTo;
    }
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

// Google OAuth Callback Route
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth.html" }),
  async (req, res) => {
    const returnTo = req.session.returnTo;
    let redirectTo = await resolvePostAuthRedirect(returnTo, req.user);

    if (req.user.role === "admin") {
      console.log(`[AUTH] Admin authenticated: ${req.user.email}`);
    } else {
      console.log(`[AUTH] Customer authenticated: ${req.user.email}`);
    }

    delete req.session.returnTo;

    // Record the login event (oauth)
    try {
      const meta = {
        session_id: req.sessionID || null,
        protocol: req.protocol || null,
        originalUrl: req.originalUrl || null,
        role: req.user && req.user.role ? req.user.role : null,
        headers: {
          accept_language: req.get("accept-language") || null,
          referer: req.get("referer") || null,
          x_forwarded_for:
            req.get("x-forwarded-for") ||
            req.headers["x-forwarded-for"] ||
            null,
          sec_ch_ua: req.get("sec-ch-ua") || null,
          sec_ch_ua_platform: req.get("sec-ch-ua-platform") || null,
          sec_ch_ua_mobile: req.get("sec-ch-ua-mobile") || null,
          host: req.get("host") || null,
          accept: req.get("accept") || null,
        },
      };

      await pool.query(
        `INSERT INTO login_events (user_id, user_type, identifier, method, ip, user_agent, meta)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          String(req.user.id || ""),
          "oauth",
          req.user.email || null,
          "google",
          req.ip || null,
          req.get("user-agent") || null,
          JSON.stringify(meta),
        ],
      );
    } catch (err) {
      console.error("Failed to record login event (oauth):", err);
    }

    // Ensure the session is persisted before redirecting to protected pages.
    req.session.save((err) => {
      if (err) {
        console.error("Failed to save session after OAuth callback:", err);
        return res.redirect("/auth.html");
      }
      return res.redirect(redirectTo);
    });
  },
);

// Phone/Password Registration Route
app.post("/auth/register", async (req, res) => {
  try {
    const { phone, name, password, returnTo } = req.body;

    if (!phone || !name || !password) {
      return res.status(400).json({
        error: "Phone, name, and password are required",
      });
    }

    // Check if phone already exists
    const existing = await pool.query(
      "SELECT * FROM users_phone WHERE phone = $1",
      [phone],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Phone number already registered" });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      "INSERT INTO users_phone (phone, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, phone, name, role",
      [phone, name, password_hash, "customer"],
    );

    const user = result.rows[0];
    await incrementPhoneUserCount();
    await incrementWaitlistCount();

    // Log the user in via Passport
    req.logIn(user, (err) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Login failed after registration" });
      }

      // Record login event for phone registration
      try {
        const ua = req.get("user-agent") || null;
        const ip = req.ip || null;
        const meta = {
          session_id: req.sessionID || null,
          protocol: req.protocol || null,
          originalUrl: req.originalUrl || null,
          role: user && user.role ? user.role : null,
          headers: {
            accept_language: req.get("accept-language") || null,
            referer: req.get("referer") || null,
            x_forwarded_for:
              req.get("x-forwarded-for") ||
              req.headers["x-forwarded-for"] ||
              null,
            sec_ch_ua: req.get("sec-ch-ua") || null,
            sec_ch_ua_platform: req.get("sec-ch-ua-platform") || null,
            sec_ch_ua_mobile: req.get("sec-ch-ua-mobile") || null,
            host: req.get("host") || null,
            accept: req.get("accept") || null,
          },
        };

        pool
          .query(
            `INSERT INTO login_events (user_id, user_type, identifier, method, ip, user_agent, meta)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              String(user.id),
              "phone",
              user.phone || null,
              "phone",
              ip,
              ua,
              JSON.stringify(meta),
            ],
          )
          .catch((err) =>
            console.error(
              "Failed to record login event (phone, register):",
              err,
            ),
          );
      } catch (err) {
        console.error("Failed to enqueue login event (phone, register):", err);
      }

      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ error: "Session save failed" });
        }

        (async () => {
          try {
            const redirectUrl = await resolvePostAuthRedirect(returnTo, user);
            res.json({
              success: true,
              message: "Account created and logged in",
              redirectUrl,
              user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                role: user.role,
              },
            });
          } catch (resolveErr) {
            console.error("Failed to resolve post-register redirect:", resolveErr);
            res.status(500).json({ error: "Failed to determine redirect" });
          }
        })();
      });
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Phone/Password Login Route
app.post("/auth/login", async (req, res, next) => {
  if (process.env.ALLOW_INSECURE_PHONE_LOGIN === "true") {
    const { phone, password, returnTo } = req.body || {};
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }
    if (!password) {
      return res.status(400).json({
        error:
          "Password required. Please enter your password or create an account.",
      });
    }

    try {
      let userRow = await pool.query(
        "SELECT * FROM users_phone WHERE phone = $1",
        [phone],
      );
      let user = userRow.rows[0];

      if (user) {
        return passport.authenticate("local", (err, authUser, info) => {
          if (err) {
            return res.status(500).json({ error: "Authentication error" });
          }

          if (!authUser) {
            return res
              .status(401)
              .json({ error: info.message || "Invalid credentials" });
          }

          return req.logIn(authUser, (err) => {
            if (err) {
              return res.status(500).json({ error: "Login failed" });
            }

            // Record login event for existing phone user
            try {
              const ua = req.get("user-agent") || null;
              const ip = req.ip || null;
              const meta = {
                session_id: req.sessionID || null,
                protocol: req.protocol || null,
                originalUrl: req.originalUrl || null,
                role: authUser && authUser.role ? authUser.role : null,
                headers: {
                  accept_language: req.get("accept-language") || null,
                  referer: req.get("referer") || null,
                  x_forwarded_for:
                    req.get("x-forwarded-for") ||
                    req.headers["x-forwarded-for"] ||
                    null,
                  sec_ch_ua: req.get("sec-ch-ua") || null,
                  sec_ch_ua_platform: req.get("sec-ch-ua-platform") || null,
                  sec_ch_ua_mobile: req.get("sec-ch-ua-mobile") || null,
                  host: req.get("host") || null,
                  accept: req.get("accept") || null,
                },
              };

              pool
                .query(
                  `INSERT INTO login_events (user_id, user_type, identifier, method, ip, user_agent, meta)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                  [
                    String(authUser.id),
                    "phone",
                    authUser.phone || null,
                    "phone",
                    ip,
                    ua,
                    JSON.stringify(meta),
                  ],
                )
                .catch((err) =>
                  console.error(
                    "Failed to record login event (phone, login):",
                    err,
                  ),
                );
            } catch (err) {
              console.error(
                "Failed to enqueue login event (phone, login):",
                err,
              );
            }

            req.session.save((saveErr) => {
              if (saveErr) {
                return res.status(500).json({ error: "Session save failed" });
              }

              (async () => {
                try {
                  const redirectUrl = await resolvePostAuthRedirect(
                    returnTo,
                    authUser,
                  );
                  return res.json({
                    success: true,
                    message: "Logged in successfully",
                    redirectUrl,
                    user: {
                      id: authUser.id,
                      phone: authUser.phone,
                      name: authUser.name,
                      role: authUser.role,
                    },
                  });
                } catch (resolveErr) {
                  console.error(
                    "Failed to resolve post-login redirect (insecure existing user):",
                    resolveErr,
                  );
                  return res
                    .status(500)
                    .json({ error: "Failed to determine redirect" });
                }
              })();
            });
          });
        })(req, res, next);
      }

      const password_hash = password ? await bcrypt.hash(password, 10) : "";
      const created = await pool.query(
        "INSERT INTO users_phone (phone, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, phone, name, role",
        [phone, phone, password_hash, "customer"],
      );
      user = created.rows[0];
      await incrementPhoneUserCount();
      await incrementWaitlistCount();

      return req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }

        // Record login event for newly-created phone user
        try {
          const ua = req.get("user-agent") || null;
          const ip = req.ip || null;
          const meta = {
            session_id: req.sessionID || null,
            protocol: req.protocol || null,
            originalUrl: req.originalUrl || null,
            role: user && user.role ? user.role : null,
            headers: {
              accept_language: req.get("accept-language") || null,
              referer: req.get("referer") || null,
              x_forwarded_for:
                req.get("x-forwarded-for") ||
                req.headers["x-forwarded-for"] ||
                null,
              sec_ch_ua: req.get("sec-ch-ua") || null,
              sec_ch_ua_platform: req.get("sec-ch-ua-platform") || null,
              sec_ch_ua_mobile: req.get("sec-ch-ua-mobile") || null,
              host: req.get("host") || null,
              accept: req.get("accept") || null,
            },
          };

          pool
            .query(
              `INSERT INTO login_events (user_id, user_type, identifier, method, ip, user_agent, meta)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                String(user.id),
                "phone",
                user.phone || null,
                "phone",
                ip,
                ua,
                JSON.stringify(meta),
              ],
            )
            .catch((err) =>
              console.error(
                "Failed to record login event (phone, create+login):",
                err,
              ),
            );
        } catch (err) {
          console.error(
            "Failed to enqueue login event (phone, create+login):",
            err,
          );
        }

        req.session.save((saveErr) => {
          if (saveErr) {
            return res.status(500).json({ error: "Session save failed" });
          }

          (async () => {
            try {
              const redirectUrl = await resolvePostAuthRedirect(returnTo, user);
              return res.json({
                success: true,
                message: "Logged in successfully",
                redirectUrl,
                user: {
                  id: user.id,
                  phone: user.phone,
                  name: user.name,
                  role: user.role,
                },
              });
            } catch (resolveErr) {
              console.error(
                "Failed to resolve post-login redirect (insecure new user):",
                resolveErr,
              );
              return res
                .status(500)
                .json({ error: "Failed to determine redirect" });
            }
          })();
        });
      });
    } catch (err) {
      console.error("Insecure phone login error:", err);
      return res.status(500).json({ error: "Login failed" });
    }
  }

  const { phone, password, returnTo } = req.body || {};
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }
  if (!password) {
    return res.status(400).json({
      error:
        "Password required. Please enter your password or create an account.",
    });
  }

  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: "Authentication error" });
    }

    if (!user) {
      return res
        .status(401)
        .json({ error: info.message || "Invalid credentials" });
    }

    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ error: "Login failed" });
      }

      // Record login event for standard phone login
      try {
        const ua = req.get("user-agent") || null;
        const ip = req.ip || null;
        const meta = {
          session_id: req.sessionID || null,
          protocol: req.protocol || null,
          originalUrl: req.originalUrl || null,
          role: user && user.role ? user.role : null,
          headers: {
            accept_language: req.get("accept-language") || null,
            referer: req.get("referer") || null,
            x_forwarded_for:
              req.get("x-forwarded-for") ||
              req.headers["x-forwarded-for"] ||
              null,
            sec_ch_ua: req.get("sec-ch-ua") || null,
            sec_ch_ua_platform: req.get("sec-ch-ua-platform") || null,
            sec_ch_ua_mobile: req.get("sec-ch-ua-mobile") || null,
            host: req.get("host") || null,
            accept: req.get("accept") || null,
          },
        };

        pool
          .query(
            `INSERT INTO login_events (user_id, user_type, identifier, method, ip, user_agent, meta)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              String(user.id),
              "phone",
              user.phone || null,
              "phone",
              ip,
              ua,
              JSON.stringify(meta),
            ],
          )
          .catch((err) =>
            console.error(
              "Failed to record login event (phone, standard login):",
              err,
            ),
          );
      } catch (err) {
        console.error(
          "Failed to enqueue login event (phone, standard login):",
          err,
        );
      }

      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ error: "Session save failed" });
        }

        (async () => {
          try {
            const redirectUrl = await resolvePostAuthRedirect(returnTo, user);
            res.json({
              success: true,
              message: "Logged in successfully",
              redirectUrl,
              user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                role: user.role,
              },
            });
          } catch (resolveErr) {
            console.error(
              "Failed to resolve post-login redirect (standard login):",
              resolveErr,
            );
            res.status(500).json({ error: "Failed to determine redirect" });
          }
        })();
      });
    });
  })(req, res, next);
});

// Logout Route
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// Start Server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(
        `🌊 Stillwater Digital Sanctuary running on http://localhost:${PORT}`,
      );
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
