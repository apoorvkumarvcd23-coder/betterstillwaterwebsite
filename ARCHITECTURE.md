# Stillwater Website & RAG Architecture (April 2026)

## 1. High-Level Overview

This monorepo powers the Stillwater Digital Sanctuary, combining a Node.js/Express web app (main site, intake, admin, testimonials, AI healer flows) and a Python/Flask microservice for RAG-based testimonial Q&A. The stack is designed for both public and authenticated (customer/admin) flows, with a focus on mobile-first UI and secure, auditable data handling.

### Main Components
- **Express/Node.js App** (repo root):
  - Serves all HTML, CSS, JS, and static assets
  - Handles authentication (Google OAuth, phone/password)
  - Manages intake, care-path, AI healer selection, and admin flows
  - Connects to a managed PostgreSQL database
  - Provides REST APIs for intake, admin, RAG, and LemonSlice AI room creation
- **RAG Microservice** (`v2rag/`):
  - Flask app for testimonial-based Q&A (retrieval-augmented generation)
  - Loads and embeds testimonial CSVs, builds FAISS index, answers via Gemini LLM

## 2. Main Website (Express/Node.js)

### Routing & Flows
- **Public pages:** `index.html`, `privacy-policy.html`, `terms-of-use.html`, etc.
- **Intake flow:** `/intake.html` collects name, phone, age, chronic conditions, eyesight, relation; stores in `intake_submissions` (Postgres)
- **Care path:** `/care-path.html` (post-intake, pre-AI)
- **AI healer selection:** `/ai-healer-choice.html` (choose Sadhguru or Captain Joseph, then routed to `/assistant.html?agentId=...`)
- **Assistant:** `/assistant.html` (AI chat, agentId param)
- **Admin:** `/admin.html` (RBAC, stats, exports, trust indicators)
- **Portal:** `/portal.html` (user dashboard)
- **Testimonials:** `/testimonials.html`, `/testimonials-diabetes.html`, `/testimonials-amar-eye-yoga.html`

### Authentication
- **Google OAuth2** (passport-google-oauth20)
- **Phone/password** (passport-local, bcrypt)
- **Session storage:** PostgreSQL via `connect-pg-simple`
- **RBAC:** Admin/customer roles, enforced on protected routes

### Database Schema (PostgreSQL)
- `users` (OAuth users)
- `users_phone` (phone/password users)
- `intake_submissions` (intake form data, linked to user if authenticated)
- `career_applications` (job applications)
- `login_events` (all login attempts/events)
- `settings` (funds, waitlist, trust stats, etc.)
- **Testimonials**: RAG tables (see below)

### Key APIs
- `/api/intake-submissions` (POST): Intake form submission
- `/api/rag/chat` (POST): RAG Q&A (calls Gemini/OpenRouter, retrieves from testimonials)
- `/api/lemonslice/rooms` (POST): Create LemonSlice AI room
- `/api/admin/*`: Admin stats, exports, user management

### Environment/Config
- `.env` for secrets (SESSION_SECRET, DB, OAuth, Gemini, etc.)
- `docker-compose.yml` for local stack
- `render.yaml` for Render deployment
- CORS, SSL, and cookie domain logic for secure multi-origin support

### Testing
- **Playwright**: E2E and layout matrix (mobile/tablet, dark/light, auth states)
- **Admin seeding**: `npm run seed:test-admin`

## 3. RAG Microservice (`v2rag/`)
- **Flask app** (`app.py`): Loads `diabetes_testimonials_only.csv`, builds FAISS index with `sentence-transformers`, answers `/chat` POSTs using Gemini LLM
- **Requirements**: `flask`, `pandas`, `numpy`, `faiss-cpu`, `sentence-transformers`, `google-generativeai`, `gunicorn`, `python-dotenv`
- **Startup**: Loads data and models in background thread
- **API**: `/chat` (POST: {query, language}) → {answer, sources}
- **Deployment**: Can run standalone (port 10000), or as a sidecar (see Render notes)

## 4. Deployment & Ops
- **Render**: Main web service + managed Postgres; RAG microservice can run as a sidecar (port 10001+)
- **Docker**: Compose for local dev; healthchecks and admin seeding supported
- **Security**: All secrets via env vars; CORS and cookie domain logic; admin RBAC
- **Monitoring**: Login events, admin exports, trust stats

## 5. Key Design Notes
- **Mobile-first**: All flows tested for mobile/tablet
- **RBAC**: Admin/customer separation, session-based
- **RAG**: Testimonial Q&A is isolated, can be scaled independently
- **Extensible**: New AI healers, flows, and datasets can be added with minimal changes

---

## 6. Production Database URL (Render)

**Format:**
```
bro really thought
```


**Notes:**
- Use `DB_SSL=true` and `sslmode=require` for all production connections.
- Store the full URL in your `.env` or Render environment settings (never commit secrets).
- The password is intentionally redacted here for security.

## 7. OAuth Localhost Redirect

- **Google OAuth is authorized for**: `http://localhost:3000` (not 3005)
- For local development with Google login, run the app on port 3000 or set up a proxy to map 3000 → 3005.
- Update your `.env` and Google Cloud Console if you need to change the redirect URI.

_Last updated: 2026-04-21_
