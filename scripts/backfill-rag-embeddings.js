require("dotenv").config();
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || "").trim();
const GEMINI_EMBED_MODEL = String(process.env.GEMINI_EMBED_MODEL || "models/text-embedding-004").trim();
const OPENROUTER_API_KEY = String(process.env.OPENROUTER_API_KEY || "").trim();
const OPENROUTER_BASE_URL = String(process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1")
  .trim()
  .replace(/\/+$/, "");
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
const TESTIMONIALS_TABLE = String(
  process.env.RAG_TESTIMONIALS_TABLE || "testimonials.testimonials_dim_diabetes_amareye",
).trim();
const BATCH_SIZE = Number.parseInt(process.env.RAG_BACKFILL_BATCH_SIZE || "25", 10);
const MAX_ROWS = Number.parseInt(process.env.RAG_BACKFILL_MAX_ROWS || "10000", 10);
const databaseUrlRequiresSsl = /[?&]sslmode=require/i.test(String(DATABASE_URL || ""));
const forceDbSsl = String(process.env.DB_SSL || "").trim().toLowerCase() === "true";
const useDbSsl = process.env.NODE_ENV === "production" || databaseUrlRequiresSsl || forceDbSsl;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (RAG_LLM_PROVIDER === "openrouter" && !OPENROUTER_API_KEY) {
  console.error("OPENROUTER_API_KEY is required when RAG_LLM_PROVIDER=openrouter.");
  process.exit(1);
}

if (RAG_LLM_PROVIDER !== "openrouter" && !GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is required when RAG_LLM_PROVIDER=gemini.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useDbSsl ? { rejectUnauthorized: false } : false,
});

const buildGeminiApiUrl = (model) => {
  return `https://generativelanguage.googleapis.com/v1beta/${model}:embedContent?key=${encodeURIComponent(
    GEMINI_API_KEY,
  )}`;
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

const toVectorLiteral = (values) => `[${values.map((num) => Number(num)).join(",")}]`;

async function embedTextWithGemini(text) {
  const response = await fetch(buildGeminiApiUrl(GEMINI_EMBED_MODEL), {
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
    throw new Error(`Gemini embedding failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const values = data && data.embedding && Array.isArray(data.embedding.values) ? data.embedding.values : null;
  if (!values || values.length === 0) {
    throw new Error("Embedding response missing embedding.values.");
  }

  return values;
}

async function embedTextWithOpenRouter(text) {
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
    throw new Error(`OpenRouter embedding failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const values =
    data && Array.isArray(data.data) && data.data[0] && Array.isArray(data.data[0].embedding)
      ? data.data[0].embedding
      : null;
  if (!values || values.length === 0) {
    throw new Error("Embedding response missing data[0].embedding.");
  }

  return values;
}

async function embedText(text) {
  if (RAG_LLM_PROVIDER === "openrouter") {
    return embedTextWithOpenRouter(text);
  }
  return embedTextWithGemini(text);
}

async function ensureVectorColumn() {
  await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
  await pool.query(`ALTER TABLE ${TESTIMONIALS_TABLE} ADD COLUMN IF NOT EXISTS embedding vector(768)`);
}

async function getMissingRows(limit) {
  const sql = `SELECT ctid::text AS row_tid, title, url, testimonial
    FROM ${TESTIMONIALS_TABLE}
    WHERE embedding IS NULL
    LIMIT $1`;
  const result = await pool.query(sql, [limit]);
  return result.rows;
}

async function updateEmbedding(rowTid, vectorLiteral) {
  await pool.query(
    `UPDATE ${TESTIMONIALS_TABLE}
     SET embedding = $1::vector
     WHERE ctid = $2::tid`,
    [vectorLiteral, rowTid],
  );
}

async function main() {
  console.log(`Backfill started for table: ${TESTIMONIALS_TABLE}`);
  console.log(`Provider: ${RAG_LLM_PROVIDER}`);
  console.log(`Batch size: ${BATCH_SIZE}, max rows: ${MAX_ROWS}`);

  await ensureVectorColumn();

  let processed = 0;
  while (processed < MAX_ROWS) {
    const remaining = MAX_ROWS - processed;
    const rows = await getMissingRows(Math.max(1, Math.min(BATCH_SIZE, remaining)));

    if (!rows.length) {
      break;
    }

    for (const row of rows) {
      const title = String(row.title || "").trim();
      const url = String(row.url || "").trim();
      const testimonial = String(row.testimonial || "").trim();
      const sourceText = `TITLE: ${title}\nURL: ${url}\nTESTIMONIAL:\n${testimonial}`;

      try {
        const embedding = await embedText(sourceText);
        const vectorLiteral = toVectorLiteral(embedding);
        await updateEmbedding(row.row_tid, vectorLiteral);
        processed += 1;
        console.log(`Embedded ${processed} rows...`);
      } catch (err) {
        console.error("Failed to embed row:", {
          title,
          url,
          error: err.message,
        });
      }
    }
  }

  const status = await pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE embedding IS NOT NULL)::int AS embedded FROM ${TESTIMONIALS_TABLE}`);
  console.log("Backfill complete:", status.rows[0]);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
