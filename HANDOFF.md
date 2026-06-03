# Stilwater Website — Handoff (2026-05-30)

Single-source-of-truth for someone picking up this repo. Skim the
**Quick Orientation** section first; the rest is reference.

---

## 0. Quick Orientation (TL;DR)

- **Repo**: `https://github.com/apoorvkumarvcd23-coder/betterstillwaterwebsite`
- **Branches**:
  - `main`  → production (`stillwater-main` Render service → `www.stillwater.you`)
  - `test`  → staging (`stillwater-test`  Render service → `stillwater-test.onrender.com`)
- **Workflow**: edits land on `test` first. After verifying, promote
  `test → main` with `git merge --no-ff` and push.
- **Live (head of test)**: `694011a` — home hero tightened (see §12 for the
  full 2026-06-01 session: post-login selection screen, Nutrition + Chronic
  RAG, ChatGPT-style server chat history, streaming chat, chat restyle).
- **Live (head of main)**: `e91be1b` — much older. Test is **far ahead of
  main** (all of the §12 work plus the earlier Stilwater AI Chat, homepage,
  auth-page, videos, mobile passes). Promote when ready.
- **Local checkout**: always returns to `test` after a promotion
  (saved user preference).
- **Standing user rule**: never push to main without explicit
  authorisation per task. Test branch is fair game.

---

## 1. Where each surface lives

| Surface | URL (test) | File(s) |
|---|---|---|
| Homepage | `/` or `/index.html` | `index.html` (forest-palette redesign, Mulish + Fraunces) |
| Auth (Login/Sign up) | `/auth.html` | `auth.html` + `admin-served.html` (twin) |
| Wellness intake form | `/intake.html` | `intake.html` |
| Care-path (main app surface) | `/care-path.html` | `care-path.html` |
| Legal pages | `/privacy-policy.html`, `/terms-of-use.html`, `/medical-disclaimer.html` | each file (share template) |
| Partners directory | `/partners.html` | `partners.html` |
| Individual partner profiles | `/partner-{sharan,amar-eye,healy}.html`, plus `sharan.html`, `AmarEyeYoga.html`, `healy.html` | per-page |
| Testimonials chooser | `/testimonials.html` | uses `css/testimonials.css` |
| Testimonial sub-pages (5) | `/testimonials-{diabetes,amar-eye-yoga,sharan-other-diseases,holistic-wellness,aa-wellness}.html` | shared CSS |
| Blog / Careers / Sharan / Healy / Assistant / Avatar | individual `.html` files at repo root | |
| Admin dashboard | `/admin.html` | `admin.html` |

---

## 2. Recent major changes (the actual handoff)

These are the substantial pieces of work currently on **test** but NOT
yet on **main**. Group of related commits per item.

### 2.1 Stilwater AI Chat (NEW feature on care-path)
**Where**: care-path.html sidebar item "Plant-Based Recipes" / "Stilwater AI Chat" (label toggles).

A ChatGPT-style overlay that opens by default on care-path, with:
- **Condition-aware greeting** tuned to user's wellness assessment
  (diabetes / eye / hypertension / general) and personalised with the
  user's first name (read from the auth pill that `js/shared.js` fills).
- **3 starter chips** pinned under the greeting (always visible).
- **Free-form chat** backed by `POST /api/stilwater/chat` (new
  endpoint, `server.js`).
- **Per-Aria-reply follow-up chips** — model is told to end every reply
  with `[FOLLOWUPS] q1 || q2 || q3 [/FOLLOWUPS]`; server parses and
  returns them in a separate `followups[]` field; client renders as
  small pill chips beneath each Aria bubble. Clicking sends the chip
  text as the next message.
- **Compose bar** (ChatGPT-style): `+` attach (image/pdf/doc/video),
  textarea, mic (Web Speech API), paper-plane send.
- **Chat history persists** in `localStorage` (`sw_aria_state_v1`) so
  history survives logout/refresh on the same browser.
- **Clear chat** pill button (top-right of chat header) — wipes
  conversation but does NOT bring back the one-time greeting.
- **Sidebar toggle**: the "Plant-Based Recipes" sidebar item label
  flips to "Stilwater AI Chat" when the chat is closed, so the label
  always names the *destination* of a click.
- **Companion "back to chat" ✕** appears top-right of the 3-tab
  companion shell when chat is closed.
- **Greeting suppression**: a separate localStorage flag
  `sw_aria_greeted_v1` was added so the greeting shows only once per
  browser — but was **rolled back** (commit `6901e18`) per user
  feedback; greeting currently shows every visit again.
- **Model**: resolved from env vars (see §4).

Key commits (chronological):
```
674b98a  initial sidebar item + 3-question scripted chat
58898f9  hide companion shell + ChatGPT-style compose bar
4c9010c  chat opens as the default landing view
9d2e610  sidebar item now toggles the chat
0ea9797  rename "Plant-Based Recipes" → "Stilwater AI Chat"; flip ✕ to companion side
a2a832c  REAL LLM chat via OpenRouter gpt-oss-120b (POST /api/stilwater/chat)
9fe68d7  fix blank render (dead RECIPE_PROMPTS reference)
680f9af  personalised greeting with name + re-greet on async loads
dc0b7d7  hide "View system prompt" debug panel
23ce989  always-visible chips + history persistence + Clear button
05e8008  pin starter chips directly under greeting
d7b444b  install user-authored agent prompt verbatim
ac6b478  re-add per-reply follow-up chips on top of the new prompt
18dff27  mobile responsiveness pass
```

### 2.2 Homepage rebuild
**File**: `index.html`. Replaced entirely (commit `8890115`).

- Mulish (body) + Fraunces (display) typography on a **forest / sage /
  gold / cream** palette (`--forest #2b4338`, `--gold #c9a978`, etc.).
- Sticky nav with Stilwater logo image (image swap: commit `6260a6f`,
  using `images/stilwater-logov3.png`).
- Hero: "Still the mind. / Nourish the body." with decorative arc SVG
  (hidden on mobile in `18dff27`).
- Sections: Meet Aria (circle visual), The Platform (3 pillar cards),
  How it works (4 steps), Pricing (₹999/month), footer with safety
  note.
- "Login / Sign up" nav CTA → `auth.html?returnTo=...`.
- Auth dropdown markup added so `js/shared.js` can populate "Hi,
  Bikramjit" pill when logged in.
- All copy carries `data-i18n` attributes; matching EN+HI entries in
  `js/i18n.js`.

### 2.3 Auth-page redesign
**Files**: `auth.html` + `admin-served.html` (twin).

- "Begin your journey." → **"Welcome to Stilwater"** with subtitle
  "Access your digital sanctuary." (commit `92b76cc`).
- Old Google/Phone toggle tabs replaced with **two stacked pill CTAs**:
  Continue with Google + Continue with Mobile Number, with `OR` divider.
- Background image: `images/AuthPageV3.png` (commit history shows
  V1.jpeg → V2.png → V3.png swaps).
- **Dark gradient overlay removed** from the photo (commit `111c6f0`
  → on main).
- Text colours switched to **black** on the left pane (commits
  `e0ab56a`, `3f476f8`) because the new bright photo washed out white.
- "← Back" link inside the phone form returns to the two-CTA view.
- Shield-icon safety footer: "Your data is safe and secure with us."

### 2.4 Care-path additions
- **AI Driven Meditation** sidebar item now plays a local video
  (`videos/MeditationForInnerPeace-YogaWithAdriene.mp4`) instead of
  iframing the React frontend (commit `6260a6f`).
- **Tadasana** intro video swapped: `tadasana-guide.mp4` →
  `Tadasana.mp4`.
- **Balasana** intro video swapped: `Childs-Pose-Stretch2.mp4` →
  `Balasana.mp4`.
- Small green companion-mark icon removed from the Stilwater Companion
  header (commit `6260a6f`).
- Sidebar header text: "Your Care Path" → **"Your Wellness Journey"**
  (commit `92b76cc` + i18n update).
- Meal Plan form: decorative cream-bowl SVG illustration in the
  header + safety note at the bottom (commit `072b4d6`).
- New sidebar item "Plant-Based Recipes" / "Stilwater AI Chat" — see
  §2.1.

### 2.5 Brand polish
- "Stillwater" (double-L) → **"Stilwater"** (single-L) sweep across 27
  files (73 visible-text replacements). Did NOT change URLs (`stillwater.you`),
  email addresses, JS function names, or test passwords.
- Logo image swaps on Home + Testimonials chooser + 5 sub-pages +
  Legal trio + Partners + Auth pages (all use `images/stilwater-logov3.png`).

### 2.6 GA / Microsoft Clarity tracking
- 25 event names wired site-wide via `js/ga-events.js`.
- 18 events wired by selector (`nav_logo_home`, `nav_logout`,
  `btn_practice_yoga_ai`, etc.).
- 7 events wired by `data-ga-event="..."` attribute on dynamic
  elements (`menu_meal_plan`, `cta_verified_providers`,
  `btn_generate_weekly_plan`, etc.).
- Both Google Analytics properties (`G-3YFE71RLJZ` primary +
  `G-GP7VFJF628` secondary) receive every event automatically.
- All gated to **prod hosts only**:
  `['stillwater.you','www.stillwater.you','stillwater-main.onrender.com']`.
  Test fires no transmissions (gtag stub no-ops on non-prod hosts).
- Microsoft Clarity tag (`ww8pdzkpcp`) is on the same gate.

### 2.7 Domain transition prep (REVERTED)
Earlier in the session, code was added to recognise `stilwater.health`
in the prodHosts arrays (plus sitemap.xml, robots.txt, og:url, server
CORS). All reverted (commits `c5dbeac`, `b1c920a`) after we discovered
`stilwater.health` was a registrar-level frameset wrapping
`stillwater-main.onrender.com`, not a real Render custom domain. **No
domain-transition code remains.** If the migration is restarted, the
prerequisite is: register `stilwater.health` + `www.stilwater.health`
as real custom domains in the Render `stillwater-main` service, then
swap DNS + Google OAuth redirect URIs + `BASE_URL` env var.

---

## 3. Render services + custom domains

| Service | Render slug | Branch | Custom domains |
|---|---|---|---|
| `stillwater-main` | `srv-d6si9ki4d50c73bobhq0` | `main` | `www.stillwater.you`, `stillwater.you` (redirects to www) |
| `stillwater-test` | `srv-d87vk3j7uimc73av6sm0` | `test` | (none) — accessed via `stillwater-test.onrender.com` |

Both auto-deploy on commit to their branch. Build is Docker (see
`Dockerfile` in repo root).

---

## 4. Environment variables on Render

Don't ever check secret values into git. The keys are:

| Var | Purpose | Notes |
|---|---|---|
| `DATABASE_URL` | Postgres (sessions + users + submissions) | Render Postgres |
| `SESSION_SECRET` | express-session HMAC | rotate sparingly |
| `BASE_URL` | absolute URL prefix used to build OAuth callback | `https://www.stillwater.you` on prod, `https://stillwater-test.onrender.com` on test. Trailing slash is stripped server-side (commit `f3b1b8b`) but cleaner to leave off. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth | Cloud Console project: "stillwater rbac" |
| `ADMIN_EMAIL` | first admin to provision | |
| `OPENROUTER_API_KEY` | OpenRouter LLM gateway | shared between agents |
| `OPENROUTER_MODEL` | model for Stilwater AI Chat (`/api/stilwater/chat`) | currently `openai/gpt-oss-120b` |
| `OPENROUTER_CHAT_MODEL` | fallback model if `OPENROUTER_MODEL` unset | currently `openai/gpt-oss-120b` |
| `OPENROUTER_EMBED_MODEL` | embeddings for testimonial RAG | |
| `ARIA_MODEL` | dedicated model for Meal Plan generation (`/api/aria/meal-plan-*`) | independent of OpenRouter chat model |
| `ANTHROPIC_API_KEY` | Maitry chat fallback (legacy) | |
| `LEMONSLICE_API_KEY` / `LEMONSLICE_AGENT_ID` | LemonSlice avatar (currently unused after meditation swap) | |
| `RAG_*` | testimonial RAG plumbing | tables named per condition |
| `CORS_ORIGIN`, `COOKIE_DOMAIN`, `ALLOW_INSECURE_PHONE_LOGIN` | server runtime | |

Free-tier **OpenRouter caps**:
- max_tokens per request ≈ 450
- prompt tokens per request ≈ 2254

Current `/api/stilwater/chat` sets `max_tokens: 700` and the system
prompt is ~1300 tokens → **adding even $5 of credits at
`https://openrouter.ai/settings/credits` removes both caps entirely**
and is strongly recommended for any real usage.

---

## 5. New API endpoints introduced in this work

| Method + path | What it does | File |
|---|---|---|
| `POST /api/stilwater/chat` | Aria wellness chat (free-form LLM over OpenRouter). Body: `{ condition, language, messages: [{role, content}] }`. **Streams the reply as SSE** (`Content-Type: text/event-stream`): `data:{delta}` events as tokens arrive, then a final `data:{done:true, reply, followups[], model, condition, prompt}` event. The trailing `[FOLLOWUPS]…[/FOLLOWUPS]` block is withheld from the visible deltas and parsed server-side into `followups[]`. Client (`care-path.html` `sendMessage`) reads the stream into a live bubble and falls back to a plain JSON read if the response isn't an event-stream. | `server.js` |
| `GET /api/intake-submissions/:id/flags` | Returns the wellness-assessment condition flags (`hasOther / hasEye / hasHolistic / hasDiabetes / hasHypertension`) for the authenticated user's submission. Used by care-path to tune the chat greeting. | `server.js` (extended in this work to include hasDiabetes / hasHypertension) |

Pre-existing endpoints not touched in this work: `/api/aria/recipes`,
`/api/aria/meal-plan-weekly`, `/api/aria/meal-plan-day`, the
`/api/lemonslice/*` family, `/api/maitry/chat`, the auth endpoints
(`/auth/google`, `/auth/google/callback`, `/auth/login`,
`/auth/register`, `/logout`), `/api/intake-submissions`, etc.

---

## 6. Local development

```
# clone + start docker
git clone https://github.com/apoorvkumarvcd23-coder/betterstillwaterwebsite
cd betterstillwaterwebsite
docker compose up -d --build      # builds main-website + Postgres
# app available at http://localhost:3005
```

Required `.env` next to `docker-compose.yml` (gitignored):

```
DATABASE_URL=postgresql://stillwater:stillwater@db:5432/stillwater
SESSION_SECRET=<random>
GOOGLE_CLIENT_ID=<from Google Cloud>
GOOGLE_CLIENT_SECRET=<from Google Cloud>
OPENROUTER_API_KEY=<from openrouter.ai>
OPENROUTER_MODEL=openai/gpt-oss-120b
ANTHROPIC_API_KEY=<optional, Maitry fallback>
LEMONSLICE_API_KEY=<optional>
# … rest match the Render env list above
```

Useful local commands:
- `docker compose logs -f main-website` — tail server logs
- `docker compose down -v` — wipe local Postgres
- Smoke test: `pwsh scripts/smoke-test.ps1`
- Test password defaults: `StillwaterAdmin#123` /
  `StillwaterUser#123` (in `scripts/seed-test-admin.js` + test specs).

---

## 7. Common operations

### Promote test → main (the only path that touches prod)
```
git fetch origin main test
git checkout main
git merge --no-ff test -m "Deploy test -> main: <one-line summary>"
git push origin main
git checkout test   # always return to test (saved preference)
```

Optional safety: zip the pre-promotion main first.
```
ts=$(date "+%Y-%m-%d_%H%M%S")
git archive --format=zip --output="main-backup-${ts}.zip" origin/main
```
The repo root has several `main-backup-*.zip` files from past
promotions — these are gitignored and safe to delete.

### Roll back a commit on test
```
git revert --no-edit <sha>
git push origin test
```

### Roll back a recent merge on main
```
git revert --no-edit -m 1 <merge-sha>     # -m 1 = keep main-side parent
git push origin main
```

### Update GA events / Clarity
Edit `js/ga-events.js`. For dynamically-rendered elements, add
`data-ga-event="<event_name>"` to the element when building it — the
generic `[data-ga-event]` rule in `ga-events.js` picks them up.

### Update the prodHosts array (which hostnames count as "production")
Run `node scripts/inject-ga.js` after editing the template inside
that file. The helper regenerates the snippet across all 30 top-level
HTML files.

---

## 8. Known issues / pending decisions

1. **Stilwater AI Chat hits OpenRouter free-tier prompt cap at ~5–8
   turns**. The persistent system prompt (~1300 tokens) + chat history
   grows past 2254 prompt tokens and starts 402-ing. **Fix**: add $5
   credit at `https://openrouter.ai/settings/credits`. Code is correct
   — this is purely a free-tier limit.

2. **One-time greeting** for the Stilwater AI Chat was implemented
   then reverted (commit `6901e18`). Currently the greeting reappears
   on every visit. User asked for it reverted; if they change their
   mind, re-apply commit `3802617`.

3. **stilwater.health domain** — registered but is a registrar-level
   frameset, not a real Render custom domain. No code references it
   anymore (all reverted). Re-attempt requires adding it as a Render
   custom domain first, then DNS + Google OAuth redirect URIs.

4. **Docker disk on dev machine** — `wsl --unregister docker-desktop`
   was used to reclaim 20 GB during the session. Docker Desktop
   recreates the distro on next launch with no data; you'll need to
   `docker compose up -d --build` once to rebuild everything.

5. **Test branch is ~33 commits ahead of main**. Promote when you're
   happy with the current test state.

6. **OpenRouter model**: currently `openai/gpt-oss-120b` (cheap,
   open-weights). For better instruction-following + warmer voice
   consider `anthropic/claude-sonnet-4.5` once credits are added.
   Swap by changing the `OPENROUTER_MODEL` env var on Render — no
   code change needed.

7. **localStorage key `sw_aria_greeted_v1`** may still exist on
   browsers that visited the test site between commits `3802617` and
   `6901e18`. Unused now; harmless. Clear if needed via DevTools →
   Application → Local Storage.

---

## 9. Mobile responsiveness state (after commit `18dff27`)

| Surface | Mobile breakpoints |
|---|---|
| Home page | ≤ 760px (general phone), ≤ 420px (tiny phones) |
| Auth pages | ≤ 540px (right pane shrinks; left image hidden < 992px already) |
| Care-path Stilwater AI Chat | ≤ 600px (compose bar, chips, header) |
| Care-path Meal Plan form | ≤ 540px (bowl SVG hidden, safety note tightened) |
| Care-path companion tabs | inherited from `css/index.css` + per-tab CSS |

All other pages (legal, partners, testimonials, blog, etc.) inherit
their mobile behavior from `css/index.css`.

---

## 10. Useful file pointers

- `server.js` — all backend (Express, auth, OAuth, OpenRouter wiring,
  LemonSlice, intake forms, RAG, Aria meal plan + recipes,
  Stilwater AI Chat endpoint, partners flags).
- `care-path.html` — single-page app surface (~4800 lines). Contains
  the Stilwater Companion (Meal Plan / Recipes / Journaling tabs), the
  Stilwater AI Chat overlay, yoga modals (Tadasana + Balasana), AI
  Driven Meditation modal, partner recommendation cards, sidebar.
- `index.html` — homepage (forest-palette redesign).
- `auth.html` + `admin-served.html` — twin auth surfaces.
- `intake.html` — wellness assessment form (with Skip button).
- `js/shared.js` — site-wide JS: auth state pill, language dropdown,
  GA event wiring, header/footer normalisation, mobile menu drawer.
- `js/i18n.js` — EN + HI dictionary. Every translation key in the app
  lives here.
- `js/ga-events.js` — GA event tracking via delegated click listener
  + `data-ga-event` attribute opt-in.
- `scripts/inject-ga.js` — one-shot helper to regenerate the GA
  snippet across all top-level HTML files.
- `css/index.css` — base styles shared by most pages.
- `css/testimonials.css` — overrides for the testimonials surfaces.
- `videos/` — Tadasana.mp4, Balasana.mp4,
  MeditationForInnerPeace-YogaWithAdriene.mp4 (committed binaries).
- `images/` — logos + bg art (stilwater-logov3.png, AuthPageV3.png,
  yoga-avatar.jpg, etc.).
- `tests/` — Playwright specs (mobile-dom, admin-intake, etc.).
- `Dockerfile` + `docker-compose.yml` — runtime config.

---

## 11. Open questions for the next person

- Should the one-time greeting return for the Stilwater AI Chat? (User
  flipped on this once; current state shows greeting every visit.)
- When is the OpenRouter top-up happening? Until then, the chat will
  hit 402 once conversations get long.
- Is the `stilwater.health` migration on or off? Currently OFF.
- Mobile-test sweep — only the new surfaces got the responsive pass.
  Older pages (blog, careers, intake, AI healer choice) may need
  their own polish.

---

## 12. Update — 2026-06-01 session (big one)

Everything below was added on top of `18dff27`. Test head is now `694011a`.

### 12.1 Post-login selection screen (the new landing)
After Google/phone login, customers land on a **4-card selection screen**
("launcher") rendered inside the care-path shell, not the assessment.
- Server: `getDefaultPostAuthRedirectForUser` → `/care-path.html?view=select`.
- Cards: **Practice Yoga**, **Plant based Nutrition**, **Chronic Disease
  Management**, **Practice Meditation**. Lives in `care-path.html`
  (`#swLauncher`); driven by `?view=` and the `window.__swPlantRecipes`
  view API (`showLauncher/showNutrition/showChronic/showYoga/showCompanion/
  showMeditation/newChat/loadSession/refreshHistory/backFromCompanion`).
- **Yoga** → opens the existing "Practice Yoga Asanas with AI" modal
  (`#yogaIntroModal`) over the launcher, now with a 3rd card **"Live Tadasana
  Practice"** → `realtime-tadasha-pose-detection-hrp4.onrender.com`
  (Tadasana card still uses the static detector; both reuse the LemonSlice
  "Tap to talk" avatar). The old `ai-all-yoga-pose-analysis` iframe was dropped.
- **Practice Meditation** → the existing AI-Driven-Meditation video modal,
  now opened via `window.__swMeditation.open()` (its sidebar button was removed).
- i18n keys under `launcher.*` (EN+HI). The subtitle line was removed per
  feedback.

### 12.2 Three Aria chat "modes" (same UI, different brain + endpoint)
The chat UI (`renderPlantRecipesChat` in care-path.html) is shared; `chatMode`
selects the backend:
- **nutrition** → `POST /api/nutrition/chat` (recipe RAG, §12.3). Header shows
  an **"Explore Plant-Based Recipes"** tab → opens the 3-tab companion shell.
- **chronic** → `POST /api/chronic/chat` (condition RAG, §12.4). Header shows a
  **"Take Wellness Assessment"** tab → intake.html.
- **general** → `POST /api/stilwater/chat` (unchanged condition-tuned chat).
All three **stream** via SSE (`data:{delta}` … final `data:{done,…}`) with the
`[FOLLOWUPS]` block parsed server-side into chips. The chat was restyled
Perplexity-style: assistant replies render as full-width prose (markdown via a
small safe `mdToHtml`), follow-ups + starter chips are a divided list with a ↳
prefix. The greeting bubble is left as a bubble. Auto-scrolls to the newest
message; compose bar pinned at the bottom; "← Back" returns to the launcher.

### 12.3 Nutrition RAG — the vector DB (THE one to know)
- **Schema: `nutrition` in the primary Postgres** (same `DATABASE_URL`).
  `nutrition.documents` (one row per book) + `nutrition.chunks`
  (`embedding vector(1536)`, cosine search). Auto-created on boot.
- The recipe/diabetes PDFs are **image-only** (no text layer), so text is
  **OCR-extracted offline** with `scripts/ocr-nutrition-pdf.mjs` (pdfjs +
  @napi-rs/canvas + tesseract.js; checkpoint/resume + per-page canvas release
  for big PDFs) into `data/nutrition/<slug>.json`. Those JSONs are committed;
  the **source PDFs and `*.pages.json` checkpoints are gitignored**.
- Ingest: `ingestNutritionDocs()` scans `data/nutrition/*.json` and embeds each
  as a document into `nutrition.chunks` (idempotent per filename; appends — no
  per-book tables). Runs in the background on boot if empty; re-runnable via
  **`POST /api/admin/nutrition/ingest`** (`?force=1` to re-embed) / status at
  **`GET /api/admin/nutrition/status`** (admin only).
- **Two books currently indexed**: "Timeless Recipes for Healthy Living"
  (217/217 chunks) and "Reversing Diabetes in 21 Days" (**469/623** — the rest
  were free-tier OpenRouter embedding rate-limits; a forced re-ingest after a
  credit top-up fills them). To add a book: OCR → drop a JSON in
  `data/nutrition/` → boot or force ingest.

### 12.4 Chronic Disease Management — RAG by condition
`POST /api/chronic/chat` picks the backend from the condition (from the
assessment flags / `activeCondition()`), grounded in the existing
**testimonial RAG datasets** (`/api/rag/chat` infra, `resolveDatasetConfig`):
- **diabetes → Sharan Diabetes Mate AI** (`diabetes` dataset)
- **eye → Amar Eye Vision Mate AI** (`amar_eye_yoga` dataset, model
  `openai/gpt-4o-mini` via OpenRouter — override with `AMAR_EYE_MODEL`)
- **anything else / Skip → Holistic Wellness AI** (`holistic_wellness`)
Each retrieves top-K testimonials, weaves in the per-condition recommendation
(Sharan / Amar Eye Yoga / "Please connect with Stilwater."), and streams.
Assessment **Skip** now goes to `/care-path.html?view=chronic` → Holistic.

### 12.5 ChatGPT-style chat history (server-side)
- New table **`aria.chat_sessions`** (`auth_user_type/id, mode, title,
  messages JSONB, …`). REST: `POST/GET/GET:id/PUT/DELETE /api/chat/sessions`
  (`GET` accepts `?mode=` to filter).
- Client: chat is no longer in localStorage; the active chat is in-memory +
  `currentSessionId`. **Every visit/login starts a new chat**; saved to the
  server on every reply (survives logout); past chats listed in the left panel
  (title + date/time), click to resume; "New chat" → launcher.
- **Left panel = chat history ONLY in Nutrition & Chronic** (hidden on the
  launcher, Yoga, Meditation, companion via `body.sw-no-sidebar`). Histories
  are **separate per module** (the `?mode=` filter) — Nutrition and Chronic
  never show each other's chats.

### 12.6 Misc
- Streaming + free-tier: `/api/nutrition/chat` trims to top-3 chunks + last 6
  msgs + `max_tokens 1100` so the reply + follow-ups fit the free budget.
- `partner-amar-eye.html` mobile overflow fixed; care-path mobile hamburger
  reachable; home hero whitespace tightened + single "Start wellness journey"
  CTA (Meet Aria button removed).
- New deps for offline OCR are **devDependencies** (`pdf-parse`, `pdfjs-dist`);
  `@napi-rs/canvas` + `tesseract.js` are installed ad-hoc (`npm i -D …`).

### 12.7 New env var
- `AMAR_EYE_MODEL` (optional) — OpenRouter model for the Amar Eye chronic flow
  (default `openai/gpt-4o-mini`).

### 12.8 Open items
- Top up OpenRouter credits to (a) remove the chat free-tier prompt cap and
  (b) finish embedding the diabetes book (469→623) via
  `POST /api/admin/nutrition/ingest?force=1`.
- Promote `test → main` when ready (still untouched this whole session).

---

## 13. Update — 2026-06-03 session

Built on top of §12. `main` is still untouched; everything below is on `test`
(code head `169c40f`). Two **untracked design-reference** files were added to the
repo root and used as the source of the redesigns: `Plant_Based_Nutrition.html`
(chat pages) and `meal_generator.html` (companion/meal planner).

### 13.1 Homepage (`index.html`, `js/shared.js`, `js/i18n.js`)
- Nav: removed **Meet Aria**; **"The Platform" → "Product"** (still scrolls to
  `#pillars`); language toggle now mounts **after Pricing** (before
  `#authMenuWrap` in `js/i18n.js`). New i18n keys `home.nav.product`,
  `home.nav.dashboard`.
- New **Dashboard** nav item (after Pricing) → `care-path.html?view=select`,
  shown **only when logged in** (`js/shared.js` toggles `#btnDashboard.hidden`).
- Hero is **left-aligned** (removed the flex auto-margin centering on `.hero`).
- Section order is now Hero → **The Platform** → **Meet Aria** → How it works →
  Pricing.
- **"Start wellness journey"** CTA → `care-path.html?view=select` (the launcher),
  NOT `?submissionId=1` (which opens the Chronic chat). `data-care-cta` removed
  so it keeps its label.
- **Logged-in return redirect** (`js/shared.js`): an authenticated customer who
  *arrives* at home (direct/bookmark/external referrer) is sent to
  `/care-path.html?view=select`. Internal nav (same-origin referrer, e.g. the
  care-path Home/logo link) still shows home; logged-out users never redirect.

### 13.2 Chat pages redesign — Nutrition + Chronic (`care-path.html`)
`renderPlantRecipesChat` rebuilt to match `Plant_Based_Nutrition.html`: slim
header (Back + mobile menu + **title beside Back** + a per-mode action),
suggestion **cards** (per-condition starters, replacing the in-chat chips), and
message **bubbles** (avatar + "Aria" name; user bubbles green/right). The
dark-green left sidebar is the chat history (icon + title + date/time + dots).
Behaviour unchanged: streaming, **follow-up chips**, per-`mode` history, dates.
- **Single outer scroller** — the messages area no longer scrolls internally;
  `.pbn-layout` is the one scroller (auto-scroll retargeted to it).
- **Header action** (the old right-side panel is gone): Nutrition → green
  **"🍽 Recipe Library"** button (`showCompanion()`); Chronic → a non-clickable
  **"Recommending [logo] NAME"** badge (SHARAN / Amar Eye Yoga), or for
  skip/other a Stilwater **"Take Wellness Assessment"** link. Chat is full-width.
- Chronic starter questions mirror the matching testimonials page's "Sample
  Questions" (`js/testimonials.js → SAMPLE_QUESTIONS_BY_DATASET`), EN+HI.

### 13.3 Meal generator (companion) redesign (`care-path.html`)
Restyled to `meal_generator.html`:
- New page header with a **Back** button → returns to the Plant-Based Nutrition
  chat (`#mgBackBtn` → `backFromCompanion()`).
- Each tab gets a **hero-card** (eyebrow + serif title + subtitle + bowl) via the
  `heroCard()` helper: Meal Plan (Weekly build, Weekly result, Today), Recipes,
  Journaling. The Weekly build form is a **2-col form-card + aside** ("How Aria
  uses this" + "Current settings") with quick chips that pre-fill the inputs.
- **Whole-page scroll**: the companion view (`#companionRoot`) is the single
  scroller on desktop (≥769px), scoped to `body:not(.plant-chat-open)`.
- **Download PDF** (jsPDF, lazy-loaded from CDN, `buildPlanPdf` /
  `downloadWeeklyPdf` / `downloadTodayPdf` / `downloadRecipePdf`): Weekly & Today
  (each meal links to its YouTube search) and the recipe-video popup. ⚠ Gotcha:
  `weeklyPlan[day][slot]` IS the meal value (string/`{en,hi}`); `todayPlan[slot]`
  wraps it as `.meal` — don't confuse the two.

### 13.4 Chronic Disease Management → partner pages (`care-path.html`, `server.js`)
After the assessment, Chronic embeds a **partner page (iframe)** chosen by
condition instead of the chat. Priority **Sharan → Sleep → Yoga → Eyesight**
(`chronicPartnerPage()`):
- diabetes / hypertension → `partner_sharan.html`
- sleep_issues → `recommend_stilwater_yoga_sharan.html`
- depression / anxiety → `stilwater_yoga.html`
- eyesight → `partner_amar.html`
- none / skipped → the existing **Holistic chat** (fallback; the chat is built
  but not mounted when a partner page applies — hidden, not removed).
The partner view is **full-page**: left chat-history sidebar hidden
(`body.sw-chronic-partner` + `sw-no-sidebar`), header/Back kept, single scroller
(the iframe's). `/api/intake-submissions/:id/flags` now also returns
**`hasDepression` / `hasAnxiety` / `hasSleep`**, carried through `applyFlags`
(URL + fetch) into `window.__swCareFlags`. The four partner HTML pages are
**committed** to the repo root.

### 13.5 Nutrition prompt + follow-ups (`server.js`)
- The **`/api/nutrition/chat` system prompt** was rewritten: Aria as a
  plant-based whole-food companion, grounded in **Dr. Nandita Shah's "Reversing
  Diabetes in 21 Days"** but **without naming the book/passages**, first person,
  ≤2 paragraphs, 8-word question-relevant follow-ups.
- **`parseStilwaterReply`** is now whitespace-tolerant (`[ FOLLOWUPS ]`) and
  handles a missing `[/FOLLOWUPS]` — fixes the raw block leaking into the answer
  / missing chips. The streaming hide-logic detects the spaced marker too.
  Applies to nutrition, chronic, and general chats.

### 13.6 Real recipe-video titles (`server.js`)
- `/api/aria/recipes` now scrapes **real YouTube titles** (`multiYoutubeVideos`)
  so the recipe popup shows distinct video names (falls back to the dish name).

### 13.7 Ops note
- The OpenRouter free-tier key hit **HTTP 402 "insufficient credits"** after a
  data ingest — embeddings AND chat share `OPENROUTER_API_KEY`, so a big ingest
  drains the budget and breaks the chat too. Top up at
  `openrouter.ai/settings/credits`; consider a **separate key for
  embeddings/ingest** vs chat.

### 13.8 Open items (carried + new)
- Still: top up OpenRouter credits; finish embedding the diabetes book
  (469→623) via `POST /api/admin/nutrition/ingest?force=1`.
- Promote `test → main` when ready (still untouched).
- The nutrition prompt says "PLAIN TEXT ONLY (no markdown)" but the client
  renders markdown — relax that line if you want richer formatting.
- The "Start wellness journey"/Dashboard links use `?view=select`; the Dashboard
  link href is fixed (not per-user).

---

_Updated 2026-06-03 from test branch head `169c40f`. Earlier: 2026-06-01
`694011a`, 2026-05-30 `18dff27`._
