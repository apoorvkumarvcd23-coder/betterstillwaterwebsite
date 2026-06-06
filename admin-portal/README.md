# Stilwater Management Analytics Portal

A small, login-gated dashboard for management:

- **KPI cards** — total users, new vs returning, active users, feature usage, etc.
- **"Ask the data" chatbot** — type a question in plain English; it turns the
  question into a **read-only** SQL query, runs it against the production
  database, and shows the result (with the generated SQL visible).

It lives on its **own branch** (`stilwateradminportal`) and runs as a **separate
Render web service** — it never touches the main website. It only **reads** the
database.

## Safety model (text-to-SQL on a live DB)
Three layers stop the LLM from harming the DB:
1. **Validation** — the generated SQL must be a *single* `SELECT`/`WITH`
   statement; any write keyword (`insert/update/delete/drop/...`) is rejected.
2. **Read-only transaction** — every query runs in `BEGIN; SET TRANSACTION READ
   ONLY; SET LOCAL statement_timeout=8s; … ROLLBACK`.
3. **(Strongly recommended) a read-only DB role** — point `DATABASE_URL` at a
   Postgres user that only has `SELECT`. Create one once on the prod DB:
   ```sql
   CREATE ROLE analytics_ro LOGIN PASSWORD '<pick-a-strong-password>';
   GRANT CONNECT ON DATABASE stillwater_swqw TO analytics_ro;
   GRANT USAGE ON SCHEMA public, aria TO analytics_ro;
   GRANT SELECT ON ALL TABLES IN SCHEMA public, aria TO analytics_ro;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public, aria GRANT SELECT ON TABLES TO analytics_ro;
   ```
   Then use that user in this service's `DATABASE_URL`.

## Deploy on Render (new web service)
1. Render → **New** → **Web Service** → connect the same GitHub repo.
2. **Branch:** `stilwateradminportal`
3. **Root Directory:** `admin-portal`
4. **Runtime:** Docker (it auto-detects `admin-portal/Dockerfile`).
   *(Or Node: Build `npm install`, Start `node server.js`.)*
5. Add the environment variables below → **Create Web Service**.
6. Open the service URL, sign in with one of the admin emails + the password.

## Environment variables to paste (Render → Environment)
| Key | Value |
|---|---|
| `DATABASE_URL` | The prod Postgres connection string. In Render → `stillwater-postgres` → **Connections**, copy the **Internal Database URL** (use `analytics_ro` if you created the read-only role). |
| `SESSION_SECRET` | Any long random string. |
| `ADMIN_PORTAL_EMAILS` | `bikramjit@stillwater.you,amar.dani@stillwater.you` |
| `ADMIN_PORTAL_PASSWORD` | `admin@1234#` |
| `OPENROUTER_API_KEY` | Same value as the main `stillwater-main` service (copy it from there). |
| `ADMIN_PORTAL_MODEL` | `openai/gpt-4o-mini` (default; or a stronger model e.g. `anthropic/claude-3.5-sonnet`). |
| `NODE_ENV` | `production` |
| `DB_SSL` | `true` *(only if your `DATABASE_URL` needs SSL and doesn't already include `sslmode=require`; the Render internal URL usually does not need it).* |

`PORT` is provided by Render automatically — don't set it.

## Local run
```
cd admin-portal
npm install
DATABASE_URL=... SESSION_SECRET=dev ADMIN_PORTAL_EMAILS=you@x.com ADMIN_PORTAL_PASSWORD=pw OPENROUTER_API_KEY=... node server.js
# open http://localhost:10000
```

## Notes
- Sessions are in-memory, so a redeploy logs admins out (they just sign in again).
- The chatbot's accuracy depends on the model — `gpt-4o-mini` is cheap and decent;
  upgrade `ADMIN_PORTAL_MODEL` for trickier questions.
- The schema the model knows about is in `server.js` (`SCHEMA_DOC`); add new
  tables/columns there as the product grows.
