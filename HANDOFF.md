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
- **`main` and `test` are IN SYNC** (2026-06-07). **Live: `main` `22d02db` ≈
  `test` `f517942`** (same tree). Promote incrementally from here.
- **Newest work is §21** (2026-06-07): **"SONI123" promo code** on the auth
  page that swaps the in-app yoga intro to a Soni-recorded variant (Tadasana +
  Cobra only, Soni videos). §20 (2026-06-06/07): new PWA app icons from the
  logo, **admin portal DEPLOYED to Render**, and a 3rd "Cobra Pose" yoga card. §19 =
  the admin portal app (branch `stilwateradminportal`); §18 = server-side
  credits + tracking + polish; §17 = GA4 reset + `stilwater.health`;
  §16 = client-side credits (replaced by §18); §12–§15 = earlier sessions.
- **`stilwater.health` is LIVE** as the real production domain (serves the app
  directly, GA `G-GNF77Q61ZQ` confirmed firing, login works). `stillwater.you`
  still works too. See §17.3/§18.6.
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

## 14. 2026-06-04 session (test head `1aa5a68`)

All on `test`. Builds on §13's Chronic → partner-page work.

### 14.1 Chronic routes from authoritative server flags (`care-path.html`, `intake.html`)
**Bug**: after submitting, the Chronic view flashed the *"Take the Wellness
Assessment"* prompt and only showed the partner page after a manual reload.
Cause: the intake redirect put only a coarse **`hasOther=1`** roll-up in the URL
(e.g. `?submissionId=18&hasOther=1`); with `hasFlagInUrl` true, care-path applied
the incomplete URL flags synchronously and **skipped** the server fetch — but
`hasOther` alone matches no partner in `chronicPartnerPage()`.
- **Fix (care-path)**: when a `submissionId` is present, **always fetch**
  `/api/intake-submissions/:id/flags` (the complete, authoritative source with
  the granular `hasDiabetes/hasHypertension/hasDepression/hasAnxiety/hasSleep`).
  A new `window.__swCareFlagsLoaded` flag drives a **spinner** while the fetch is
  pending so the prompt never flashes; URL flags are only a fallback if the fetch
  fails. Skip / no-submission still shows the prompt immediately.
- **Fix (intake)**: the redirect now also passes the granular flags
  (`hasDiabetes`, … `hasSleep`) so the fallback path is accurate too.

### 14.2 Updated Chronic routing matrix (`chronicPartnerPage()`)
Current logic (`active` = count of diabetes/hypertension/depression/anxiety/
sleep/eye that are true):
- **Eyesight + any other (2+ total)** → `recommend_amar_sharan.html`
- **Any other 2+ combination** (e.g. diabetes+anxiety) → `partner_sharan.html`
- diabetes / hypertension (single) → `partner_sharan.html`
- sleep (single) → `recommend_stilwater_yoga_sharan.html`
- depression / anxiety (single) → `stilwater_yoga.html`
- eyesight (single) → `partner_amar.html`
- none / skipped → full-page **assessment prompt** (no chat)

### 14.3 True full-page scroll for the Chronic partner page (`care-path.html`)
The embedded partner iframe previously scrolled inside a trapped region. Now:
- The iframe is **auto-sized to its full content height** (same-origin
  `scrollHeight`, re-measured on load/resize) so it never scrolls internally.
- For `body.sw-chronic-partner`, the app-shell height/overflow pinning is
  unwound (`.care-shell` height:auto + overflow visible down through
  `.care-stage`/`.companion-chat`/`.plant-chat-overlay`/`.pbn-layout`) so the
  **whole page (body) scrolls** as one. Verified desktop + mobile.

### 14.4 Assessment form: Skip button + complete asterisks (`intake.html`)
- Added a **"Skip for now →"** button at the **top-right** of the form header
  (mirrors the existing bottom one → `/care-path.html?view=chronic`).
- `refreshRequiredStars()` now also stars **group labels without `[for]`** (e.g.
  *"Are you on Insulin?"* radio group, *"What is your blood pressure levels"*
  systolic/diastolic) — previously only `.form-label[for]` got the red `*`.

### 14.5 Chronic header chip removed (`care-path.html`)
Removed the **"Take Wellness Assessment"** chip from the Chronic header (the
skip / non-diabetes-eye case) — the assessment-prompt page already has its own
centre CTA. **Unchanged**: the Nutrition header's **🍽 Recipe Library** action
and the **"Recommending SHARAN/Amar Eye Yoga"** chip (diabetes/eye).

### 14.6 Nutrition chat: duplicate disclaimer removed; full-page scroll reverted
- Removed the inner per-chat `.pbn-disclaimer` (it duplicated the page-level
  `.companion-hint` at the bottom of every view) — frees the wasted space.
- A full-page-scroll mode for the Nutrition/general chat (`sw-chat-fullpage`)
  was added then **rolled back per user request** — the chat keeps its original
  app-style in-pane scroll. (The duplicate-disclaimer removal was kept; only the
  scrolling change was reverted.)

### 14.7 Open items (carried)
- Same as §13.8: top up OpenRouter credits; finish embedding the diabetes book
  (469→623); promote `test → main` when ready.
- `NUTRITION_MODEL` env override exists (only the nutrition chat can use e.g.
  `anthropic/claude-sonnet-4.5`) — needs setting on Render + OpenRouter credits.
- Lead-capture form (`js/partner-lead.js` → `POST /api/partner-lead` →
  `partner_leads` table) is wired on the partner pages; verify the DB insert on
  the deployed site.

---

## 15. 2026-06-04 session #2 (test head `9f237ce`)

All on `test`. Builds on §14. Mostly copy/UX polish on the dashboard + chronic
flow, plus a new **Trusted Partners** menu, **avatar removal**, and **PWA**.

### 15.1 Nutrition chat copy (`care-path.html`, `js/i18n.js`) — `ddb1b48`
- Greeting rewritten: the `Hi {name},` prefix is **unchanged** (still
  `getUserFirstName()`); only the body changed to *"I'm Aria, your AI companion
  for healthy living. Feel free to ask me anything about healthy living and
  plant-based recipes."* (`aria.chat.greetNutrition`, EN+HI).
- The 3 nutrition starters (`aria.chat.startNutrition.{1,2,3}`) are now:
  **Can Type 2 Diabetes be reversed? / Is animal food good for health? /
  Suggest some good recipes for breakfast.** They still drive the live chat
  (click = send).

### 15.2 Dashboard launcher cards (`care-path.html`, `js/i18n.js`) — `a2ddc15`
`launcher.*` titles/descriptions (EN+HI):
- Yoga → **"AI Yoga Tutor (Beta)"** (desc unchanged).
- Nutrition → **"AI Nutritionist for Healthy Living"** + new desc (meal plans +
  YouTube recipes). This title also drives the nutrition **chat-page header**
  (`launcher.nutrition.title` reused at the header-title fallback).
- Chronic → new desc ("Get connected to verified and trusted holistic wellness
  providers…"); title unchanged.
- Meditation → **"AI Guided Meditation (Coming Soon)"**.
- Also: `.sw-launcher-title` bottom margin `0.4rem → 1.6rem` for breathing room
  under the welcome heading (`406eaf7`).

### 15.3 Dashboard Yoga intro → full-page view (`care-path.html`) — `0a03c94`, fix `2b7df54`
The AI-Yoga-Tutor intro (`#yogaIntroModal`, opened from the dashboard card / yoga
header buttons) is no longer a dark-dimmed popup:
- Restyled to a **light full-page surface** below the site header (page bg
  `#f4f1ea`, top-aligned, no card chrome, the redundant ✕ hidden, no
  backdrop-click-to-close — exit via Back).
- **Removed the "Live Tadasana Practice" card** and its JS
  (`POSE_APP_URL_LIVE` / `yogaLiveOpen`). Card titles → **"Practice Tadasana" /
  "Practice Balasana"**; CTA **"Try the AI Coach" → "Watch & Learn"**.
- ⚠ **z-index fix** (`2b7df54`): the overlay was `z-index:150`, **above** the
  shared fixed site header (`css/index.css .header` is `z-index:100`) and its
  EN/auth dropdowns (55–60) — so the header looked dimmed and its menus opened
  behind it. Lowered `#yogaIntroModal` to **`z-index:40`** (below header + menus,
  above page content ≤20). If you add more full-page overlays, keep them <100.

### 15.4 Tadasana flow: AI avatar removed entirely (`care-path.html`) — `3c99fb0`
Removed the **LemonSlice "Tap to talk" avatar** from the whole Tadasana
(`yogaModal`) flow: the `<script>` include, the pill + `<lemon-slice-widget>`
markup, all `.static-avatar-*` / `#lemonWidgetContainer` CSS, and the agent JS
(`showAvatarPill`/`activateAgent`/`teardownAgent`, `agentActivated`, listeners).
The **"What's next?"** choice now offers only **Practice Now** (promoted to the
primary green button) and **Repeat Video**. `images/yoga-avatar.jpg` is now
unused (left in repo). Balasana never had the avatar.

### 15.5 Chronic yoga recommendation page (`stilwater_yoga.html`) — `3ebf7b5`, `d256352`
This is the page embedded for **depression/anxiety** (see §14.2 routing). Reworked
the hero:
- Dropped the **"Guided Practice"** eyebrow and the *"We're building an AI
  avatar…"* lede.
- Added intro line **"Based on your Wellness assessment, we recommend the
  following wellness regimen:"** above the *"Practice Yoga with Stilwater"*
  heading, then **"The following AI-guided asanas will help you manage your
  chronic condition effectively…"** below it.
- Removed the bottom *"A few mindful minutes…"* reassure line.
- (Cards there still say "Practice Yoga Asanas with AI" / "Try the AI Coach" —
  this is a **separate** standalone page from the dashboard modal in §15.3.)

### 15.6 "Other Trusted Providers" menu + per-partner Back (`care-path.html`, partner pages, `js/i18n.js`) — `511e52b`, `5c7c27e`
New dropdown in the **Chronic header** (built in `renderPlantRecipesChat()`'s
chronic branch) — present on every chronic page since it lives in the header:
- Button **"Other Trusted Providers"**; items **SHARAN → `partner_sharan.html`,
  HEALY → `partner_healy.html`, AMAR EYE YOGA → `partner_amar.html`**
  (`carepath.partners.*`, EN+HI).
- Selecting one swaps the embedded iframe to that partner page with
  **`?swback=<previous-url>`**. The partner iframe was refactored into
  `mountPartnerFrame()` (keeps the auto-height sizing) and `partnerCurrentUrl`
  is **synced from the iframe on each load** so the swback chain stays correct
  even after an in-page Back.
- Each of the 3 partner pages (`partner_sharan/healy/amar.html`) gained an
  **in-app Back bar** right after `<body>` that shows **only when `?swback=` is
  present** and returns there (`window.location.href = back`). Opened directly /
  as the default route → Back stays hidden. `partner_healy.html` is now tracked.
- **Routing matrix (`chronicPartnerPage()`) is unchanged** from §14.2.

### 15.7 PWA — installable + offline-ready — `76aa8af`
New Progressive Web App across mobile + laptop sizes:
- **`manifest.webmanifest`**: standalone display, theme `#264f45` / bg `#f4f1ea`,
  icons **192 + 512 (any + maskable)**, and **screenshots** for `narrow`
  (mobile 1080×1920) + `wide` (desktop 1920×1080) form factors.
- **`sw.js`**: deliberately **network-first** for same-origin GET (so an online
  user never gets stale content — important for this fast-moving test site);
  cache fallback when offline, **`offline.html`** for failed navigations;
  bypasses non-GET, cross-origin, `/api/`, `/auth/`. Versioned cache
  `stilwater-v1` — **bump `CACHE_VERSION` in `sw.js`** to force-clear caches.
- Icons/screenshots generated under **`images/icons/`** (PowerShell
  System.Drawing, from `images/transparent-stillwater-new-logo.png`).
- SW registered via **`js/shared.js`** (core pages) + inline on `intake.html`
  (no shared.js). Manifest link + apple/theme meta added to **index, care-path,
  auth, intake, portal**. Other pages aren't linked yet (SW scope is `/`, so once
  installed it covers them — but the **install prompt only appears on the 5
  linked pages**).
- Static files (`manifest.webmanifest`, `sw.js`, `offline.html`,
  `images/icons/*`) are served publicly by `express.static(__dirname)` (no auth);
  `/` → `index.html`, so `start_url` works.

### 15.8 Home page: pricing hidden (`index.html`) — `9f237ce`
The pricing band (`#pricing`) and the **Pricing** links in the **header nav** and
**footer** are hidden via inline **`style="display:none"`** (kept in the DOM with
a restore comment). To bring pricing back, delete those three inline styles.

### 15.9 Backups
Local working-tree zips created this session (untracked, per convention):
`test-backup-2026-06-04_204729.zip` (avatar removal),
`_215716.zip` (PWA). Made via PowerShell `Compress-Archive` excluding
`.git` / `node_modules` / `*.zip` — there is **no backup script**; `zip` is not
available in the bundled bash, use Compress-Archive.

### 15.10 Open items (carried)
- Same as §14.7 (OpenRouter credits, finish embedding the diabetes book,
  promote `test → main`, `NUTRITION_MODEL` env, verify `partner_leads` insert).
- PWA: optionally add the manifest `<link>` to the remaining pages so the install
  prompt appears everywhere; replace the placeholder screenshots with real app
  captures.

---

## 16. 2026-06-05 session — client-side credits (test head `db5733d`)

All on `test`. A self-contained **"gold coins" credit prototype**. Deliberately
**client-side only** — there is **no DB table, column, or API** for credits; the
balance lives in the browser. The user explicitly chose to keep it client-side
"for now". If/when it needs to be real (reset on user delete, per-account,
cross-device, tamper-resistant), it must move server-side (a `credits` value per
user in Postgres + read/spend endpoints). **The previous sessions' open items
(OpenRouter credits, finish embedding the diabetes book, promote test → main,
`NUTRITION_MODEL`, verify `partner_leads` insert) are all still open** — none
were touched this session.

### 16.1 The credit module (`js/credits.js`, NEW)
Single drop-in file (injects its own CSS, no markup needed). Exposes
`window.SwCredits = { get, set, spend }`.
- **Balance**: `localStorage` key **`sw_credits_v1`**, starts at **50**, clamps
  at 0 (`spend()` never goes negative). Per-browser, NOT per-account.
- **Auth**: does its own `GET /api/auth/me` fetch to decide logged-in vs out
  (decoupled from `shared.js`).
- **Gold-coin badge**: rendered into `#authActions`, inserted just **left of
  `#authMenuWrap`** (the "Hi, [name]" pill), shown only when authenticated;
  pulses on each spend. Re-asserted at 600ms + 1500ms after load to survive
  `shared.js`/`i18n.js` rebuilding the header.
- Included via `<script src="js/credits.js">` on **`care-path.html`** (right
  after `js/shared.js`) and **`index.html`** (after its `shared.js`). Not on
  other pages.

### 16.2 Spend hooks (−1 coin each, in `care-path.html`)
- **Tadasana "Watch & Learn"** — the `yogaBetaOpen` click handler.
- **Balasana "Watch & Learn"** — the `yogaBalasanaOpen` click handler.
- **Every AI Nutritionist message** — hooked the single `sendMessage()` choke
  point, so a starter card, a follow-up chip, AND a typed question each cost 1.
All guarded with `if (window.SwCredits) …` so they're no-ops if the module
failed to load. **Actions are never blocked at 0** — the balance just bottoms
out (least-destructive choice; change here if you want hard gating).

### 16.3 Logged-out "log in to get free credits" nudge
A small dark-green pill popup for logged-out visitors.
- **First-time-only** (`ddb…`→`9be6321`): shows only until the browser has
  logged in **once** — on success, `localStorage` flag **`sw_has_logged_in`** is
  set and the nudge never returns (not next visit, not after a later logout).
  `showNudge()` early-returns if that flag is set. ⚠ This is **per-browser**, not
  per-email — a logged-out visitor has no known email, so true per-email gating
  would need server-side state. (User was told and accepted this.)
- **Position** (`db5733d`): anchored just **below the green `#btnLogin`** button
  (top-right) via `positionNudge()` reading the button's rect, re-pinned on
  `resize`. Falls back to the top-right corner if the button is hidden (mobile
  hamburger). Was originally bottom-center; moved per user request.
- A session-level dismiss (`×` → `sessionStorage` `sw_credits_nudge_dismissed`)
  also suppresses it for the current tab session.

### 16.4 Testing / reset (important — it's all browser state)
Deleting the DB user does **NOT** reset coins or the nudge flag (those are
`localStorage`, not Postgres). To test fresh: use an **incognito window**, or in
DevTools console:
```js
localStorage.clear(); sessionStorage.clear(); location.reload();
// or selectively:
localStorage.removeItem('sw_credits_v1');     // coins → 50
localStorage.removeItem('sw_has_logged_in');  // nudge shows again
```
To reset a DB account for the Google login flow (separate concern — assessment
re-shows because `intake_submissions` keys off the stable Google id, not the
`users` row, so delete both):
```sql
DELETE FROM intake_submissions WHERE auth_user_id IN (SELECT id FROM users WHERE lower(email) IN ('addr@example.com'));
DELETE FROM users WHERE lower(email) IN ('addr@example.com');
```

### 16.5 Commits
```
10ee155  credit system: gold-coin badge + spend hooks (Tadasana/Balasana/chat)
9be6321  login nudge shows only until first login (sw_has_logged_in)
db5733d  anchor login nudge under the green Login button + reposition on resize
```

### 16.6 Open items (carried + new)
- Carried: all of §15.10 (OpenRouter credits, finish diabetes book embed,
  promote test → main, `NUTRITION_MODEL`, verify `partner_leads`).
- New: credits are a client-side prototype. If real credits are wanted, build the
  server-side version (DB-backed balance + atomic spend endpoint) and have the
  badge/spend hooks call it instead of `localStorage`.

---

## 17. 2026-06-05 session #2 — GA4 reset + event taxonomy + stilwater.health (test head `a2a6252`)

All on `test`. `main` is still `e91be1b` (untouched). Two pieces: a full GA4
re-instrumentation from a supplied button/event list, and adding the new
production domain to the host gates.

### 17.1 GA4 property swap — single new property (`1593b70`)
- **Removed** the old pair `G-3YFE71RLJZ` + `G-GP7VFJF628`; **added the single
  new property `G-GNF77Q61ZQ`** (real ID, not a placeholder).
- **The prod-host gate is preserved** — analytics still transmits ONLY on prod
  hosts; test/localhost no-op. The user's pasted "standard" ungated snippet was
  deliberately NOT used (it would fire on test). This was the user's stated
  hard requirement: *data populates on main only, never test.*
- `scripts/inject-ga.js` now uses the single ID AND **re-processes
  already-injected pages** (removed the `NEW_MARKER` short-circuit) so an ID
  change propagates. Re-ran → regenerated the snippet across **30 HTML files**.
  Re-running is idempotent.

### 17.2 Event tracking rewritten to the new taxonomy (`1593b70`)
- **`js/ga-events.js` rewritten.** A reusable `track(name, el)` helper sends a
  consistent param bundle on every event: `event_category`, `section_name`,
  `button_name`, `event_label`, `page_path`, `tracking_purpose`, and `link_url`
  (anchors). Category/section are derived from the event-name prefix
  (`header_`/`footer_` → navigation, `ai_nutritionist_` → ai_nutritionist, …).
- **Two wiring mechanisms** (data-ga-event wins, then selector rules):
  1. `data-ga-event="<name>"` on dynamically-built elements (set at their
     createElement site) — chat buttons, recipe-library tabs, provider items,
     suggestion questions, chat-history rows, etc.
  2. Static **selector rules** in `ga-events.js` for stable elements
     (header/footer/mobile nav, login page, launcher cards, yoga buttons).
- **~67 of 69 events implemented** across `index.html`, `care-path.html`,
  `intake.html`, `auth.html`/`admin-served.html` (via rules), and the partner
  pages. The old event names (`nav_logo_home`, `menu_meal_plan`,
  `btn_find_recipes`, …) were replaced by the new taxonomy.
- **Partner pages got GA for the first time**: `partner_amar.html`,
  `partner_sharan.html`, `partner_healy.html` had **no GA snippet** (they're the
  underscored chronic-embed pages, distinct from the hyphenated `partner-*.html`).
  Added the gated snippet + `ga-events.js` to all three and wired Book Now.
- **2 events skipped** (no matching clickable element — reported, not faked):
  - `login_page_link_forgot_password` — it's a plain `<p>` in auth.html (no
    href/onclick) and absent from admin-served.html.
  - `recipe_library_button_generate_today_meal_plan_pdf` — the Today view has
    only one PDF button (already wired as `…_download_today_pdf`).
- **2 events mapped with a caveat**: `trusted_providers_amar_eye_book_now` →
  the Amar page's "Explore Amar Eye Yoga →" CTA (no literal "Book Now");
  `trusted_providers_sharan_book_now` → tagged on ALL 4 Sharan booking CTAs
  (3 "Book →" program cards + "Connect with Sharan →").
- One pre-existing off-list tracker, `nav_dashboard` (home Dashboard link), was
  left as-is.

### 17.3 New production domain `stilwater.health` (single-L) (`a2a6252`)
The live domain is moving to **`stilwater.health`** (single L — matches the
"Stilwater" brand; the old web domain was `stillwater.you`, double-L). Added
**additively** (both work during the transition; `stillwater.you` retired later):
- **GA + Clarity prod-host gates**: added `stilwater.health` +
  `www.stilwater.health` to the array on all 33 pages + the inject-ga.js
  template (the gate literal is identical for both GA and Clarity, so one
  scripted replace covered both — 64 gates).
- **`server.js` CORS**: now allows `stilwater.health` and `*.stilwater.health`.
- Note: `index.html` footer already displayed `www.stilwater.health`.

### 17.4 ⚠ External / cutover steps NOT done in code (REQUIRED before prod works)
These are outside the repo and were flagged to the user:
- **Render**: register `stilwater.health` + `www.stilwater.health` as real
  custom domains on `stillwater-main` and point DNS at Render. Per §2.7,
  `stilwater.health` was previously only a registrar frameset wrapping
  `onrender.com`, NOT a real Render domain — confirm its current status.
- **`BASE_URL=https://www.stilwater.health`** env var on the `stillwater-main`
  Render service (builds the OAuth callback). Wrong value → Google login breaks.
- **Google OAuth redirect URI** `https://www.stilwater.health/auth/google/callback`
  added in the "stillwater rbac" Cloud Console project.
- **SEO canonical SWITCHED** (`3e65e6b`): `sitemap.xml` (all 30 `<loc>`) and
  `robots.txt` Sitemap line now point to `https://www.stilwater.health`. Still
  TODO (infra, not code): add a **301 redirect** `stillwater.you →
  www.stilwater.health` and **resubmit the sitemap in Google Search Console**
  for the new domain property (Search Console, NOT GA — GA takes no sitemap).
- **Emails** (`*@stillwater.you` in `js/i18n.js`, `server.js` admin set) left
  untouched — confirm whether mailboxes also move to `@stilwater.health`.

### 17.5 Commits
```
1593b70  GA4: swap to single property G-GNF77Q61ZQ + wire Excel event taxonomy
a2a6252  Domain: recognise stilwater.health as production (alongside stillwater.you)
3e65e6b  SEO: switch sitemap + robots canonical to www.stilwater.health
```

### 17.6 Open items
- **Promote `test → main` planned 2026-06-06** — ships §12–§17 together (101
  commits). Do the §17.4 external steps with it.
- Carried: OpenRouter credits, finish diabetes-book embed, `NUTRITION_MODEL`,
  verify `partner_leads`, server-side credits (if real credits wanted, §16.6).

---

## 18. 2026-06-05/06 session — credits go server-side, tracking, polish, GO-LIVE

Big session. The §12–§17 backlog was **promoted to production** in several
verified merges (each: backup `origin/main` → `git merge --no-ff` → confirm the
merged tree == `origin/test` → push → `git checkout test`). `main` is now
current. Below is what was built/changed, newest concerns first.

### 18.1 Server-side credits (replaces the §16 client-side prototype)
Credits are now **real and per-user** (DB-backed), so you can report who spent
how much. **DB (auto-created in `initDb`, schema `public`):**
- **`user_credits`** — current balance per user: `auth_user_type, auth_user_id,
  email, name, balance, total_spent, created_at, updated_at` (PK on type+id).
- **`credit_events`** — append-only **ledger**, one row per spend: `…, action,
  cost, balance_after, created_at`.

**API** (`server.js`): `GET /api/credits` (balance; creates the row at
`CREDITS_START`=50, override via env), `POST /api/credits/spend {action}`
(atomic decrement, clamps at 0, writes a ledger row), `GET /api/admin/credits`
(admin report). **`js/credits.js` rewritten** to read/spend via the server (was
`localStorage`); the coin badge + logged-out nudge are unchanged. Spend hooks in
`care-path.html` pass action labels: **`tadasana_watch_learn` /
`balasana_watch_learn` / `nutrition_chat`** (the single `sendMessage()` choke
point covers starter card / follow-up chip / typed question).
**Admin UI:** new **`/credits-admin.html`** (protected route + "Credits" link in
`admin.html`) showing per-user balance, total spent, action breakdown.

### 18.2 Dedicated yoga-click tracking (separate from credits)
- **`yoga_clicks`** table (one row per "Watch & Learn" click: user, `asana`,
  `asana_key`, time) + **`yoga_clicks_by_user`** VIEW (one row per user, asanas
  in nested JSON). Auto-created in `initDb`.
- **API:** `POST /api/yoga-click {asana,key}`, `GET /api/admin/yoga-clicks`.
  Client: `trackYogaClick()` fires on each Tadasana/Balasana Watch & Learn
  (alongside the credit spend, but decoupled). Admin page has a "Yoga clicks"
  panel. **New asanas** just call `trackYogaClick("<Name>","<key>")` — they
  appear in the view automatically.

### 18.3 Useful DB queries (read on the prod DB `stillwater-postgres`)
```sql
-- credits per user
SELECT name,email,balance,total_spent FROM public.user_credits ORDER BY total_spent DESC;
-- spend by action
SELECT action,COUNT(*),SUM(cost) FROM public.credit_events GROUP BY action;
-- yoga: who clicked which asana (nested JSON)
SELECT * FROM public.yoga_clicks_by_user ORDER BY total_clicks DESC;
-- nutrition QUESTIONS per user (user messages only) — from chat history
SELECT COALESCE(u.name,up.name) AS user_name, u.email,
       jsonb_agg(m.value->>'text' ORDER BY cs.updated_at) AS questions
FROM aria.chat_sessions cs
LEFT JOIN public.users u        ON cs.auth_user_type='oauth' AND u.id=cs.auth_user_id
LEFT JOIN public.users_phone up ON cs.auth_user_type='phone' AND up.id::text=cs.auth_user_id
CROSS JOIN LATERAL jsonb_array_elements(cs.messages) AS m(value)
WHERE cs.mode='nutrition' AND m.value->>'role'='user'
GROUP BY COALESCE(u.name,up.name), u.email;
-- Google logins today (IST): join login_events → users for the name
SELECT le.created_at,u.name,le.identifier AS email FROM public.login_events le
LEFT JOIN public.users u ON u.id=le.user_id
WHERE le.method='google'
  AND (le.created_at AT TIME ZONE 'Asia/Kolkata')::date=(now() AT TIME ZONE 'Asia/Kolkata')::date;
```
⚠ Chat messages are `{role,text}` with **no per-message timestamp** — date
filtering on questions is at the session level (`cs.updated_at`). `nutrition`
questions can be made a permanent VIEW (`CREATE OR REPLACE VIEW
nutrition_questions_by_user AS …`) if wanted.

### 18.4 Dashboard header link (`js/shared.js`)
A **"Dashboard"** link is injected into `#authActions` on every page, **before
the EN/HI toggle** (`[Dashboard] [EN] [coins] [Hi,name]`), shown only when
logged in → `/care-path.html?view=select`. **Hidden on the launcher view
itself** (the page IS the dashboard) but shown on yoga-intro / meditation /
chat — driven by `#swLauncher` visibility + a `MutationObserver` (the care-path
SPA switches views without a reload). Skipped on the home page (it already has
its own `#btnDashboard`).

### 18.5 Chronic / nutrition bug fixes (`care-path.html` + partner/recommend pages)
- **AI Nutritionist "New chat"** now reopens a CLEAN chat in the current module
  (keeps the left history) instead of bouncing to the dashboard.
- **"Try the AI Coach"** pointed at the homepage; repointed to the in-app yoga
  tutor (`care-path.html?view=select`) in `stilwater_yoga.html` +
  `recommend_stilwater_yoga_{amar,sharan}.html`.
- **"Back to recommendations"** (linked to a claude.ai artifact) **removed** from
  `partner_amar.html` + `partner_sharan.html`.
- **Amar "Explore Amar Eye Yoga"** now opens the **lead-capture form** (was
  navigating away): added a generic **`.sw-lead-cta`** opt-in to
  `js/partner-lead.js`'s selector and tagged the button. (`partner-lead.js` wires
  `a.prog, a.btn-clay, .sw-lead-cta` → the Book-a-consultation modal →
  `partner_leads`.)

### 18.6 Domain, share image, cookie banner
- **`stilwater.health` is the live prod domain** (real Render custom domain,
  serves the app directly — NOT the old frameset; GA fires with correct
  attribution). `sitemap.xml` + `robots.txt` canonical point to
  `www.stilwater.health`. `stillwater.you` still works. **Still external/TODO if
  fully cutting over:** confirm Render `BASE_URL`/OAuth redirect URI for the
  health domain, 301 `stillwater.you → stilwater.health`, retire the old domain.
- **Social share image:** `index.html` now has Open Graph/Twitter tags →
  **`images/og-share.png`** (1200×1200, Stilwater logo centered on white, built
  via PowerShell System.Drawing from `stilwater-logov3.png`). Only on the
  homepage so far — add to other pages if you want every shared link branded.
  Chat apps cache previews; re-scrape with `?v=N` or a debugger.
- **Cookie-consent fix:** the banner's styles live only in `css/index.css`,
  which `index.html` doesn't load, so the **Accept button was invisible** on the
  homepage (default grey on cream). `js/shared.js` now **injects self-contained
  banner styles** (forest-green `#btnAcceptCookies`, id selector wins
  everywhere) when the banner shows.

### 18.7 Key commits (prod heads, newest first)
```
1079e54  Amar Explore CTA -> lead form
3c1fb43  cookie-consent Accept button visible on homepage
c52a2a2  square share image (og-share.png)
7f7be38  nav/link fixes + Dashboard header link + share image
cb65e0c  dedicated yoga click tracking (yoga_clicks)
6e47b6a  server-side credits (user_credits + credit_events)
4ce3524  §12–§17 promotion (AI chat/RAG, chronic, PWA, credits, GA4, domain)
```

### 18.8 Open items (carried)
- OpenRouter credits (chat free-tier cap + finish embedding the diabetes book
  469→623 via `POST /api/admin/nutrition/ingest?force=1`).
- `NUTRITION_MODEL` env override; verify `partner_leads` inserts on prod.
- Domain cutover externals (§18.6): `BASE_URL`/OAuth for stilwater.health, 301,
  retire `stillwater.you` when ready.
- OG tags on the non-home pages if you want every shared link branded.

---

## 19. 2026-06-06 — Management analytics portal (separate app + branch + Render service)

A standalone **analytics dashboard for management** so they can self-serve the
metrics (user counts, new/returning, active users, feature usage, nutrition
questions, etc.) instead of asking the dev to run SQL. **It is intentionally
isolated from the main website.**

- **Branch:** **`stilwateradminportal`** (based off `main`). Code lives in the
  **`admin-portal/`** folder. NOT merged into `main`/`test` — it deploys as its
  own service.
- **What it is:** a small Express app (`admin-portal/server.js`) +
  `public/login.html` + `public/dashboard.html`. Login-gated (email+password
  from env). **Read-only** against the prod DB.
- **Two halves:**
  1. **KPI cards + a 14-day new/active-users chart** — `GET /api/kpis`,
     `GET /api/kpis/daily` (all IST-aware).
  2. **"Ask the data" chatbot** — `POST /api/ask {question}`: the question →
     LLM → a **read-only SQL** query → run → table + a 1-line summary. The model
     gets the schema in `SCHEMA_DOC` (server.js); uses `OPENROUTER_API_KEY`,
     model from `ADMIN_PORTAL_MODEL` (default `openai/gpt-4o-mini`).
- **Safety (LLM SQL on a live DB):** (1) only a single `SELECT`/`WITH` is
  allowed (write keywords blocked), (2) every query runs in a `READ ONLY`
  transaction with an 8s `statement_timeout`, (3) README documents creating a
  **read-only Postgres role** (`analytics_ro`) for the service's `DATABASE_URL`.
- **Deploy:** new Render **Web Service** → repo, **branch
  `stilwateradminportal`**, **root dir `admin-portal`**, Docker runtime
  (`admin-portal/Dockerfile`). Env to set (see `admin-portal/README.md`):
  `DATABASE_URL` (prod Postgres internal URL / read-only role), `SESSION_SECRET`,
  `ADMIN_PORTAL_EMAILS` (`bikramjit@stillwater.you,amar.dani@stillwater.you`),
  `ADMIN_PORTAL_PASSWORD`, `OPENROUTER_API_KEY`, `ADMIN_PORTAL_MODEL`,
  `NODE_ENV=production`. `PORT` is auto.
- **To extend:** add new tables/columns to `SCHEMA_DOC` in `server.js` and new
  KPI queries in the `/api/kpis*` handlers. Sessions are in-memory (a redeploy
  re-prompts login).

---

## 20. 2026-06-06/07 — PWA icons, admin portal DEPLOYED, Cobra Pose card

### 20.1 PWA app icons regenerated from the new logo (`3de40a1`, live)
The installed home-screen / PWA icon was still the old dark-lotus logo. Replaced
**`images/icons/`** `icon-192/512`, `icon-maskable-192/512`, and
`apple-touch-icon.png` with the current **`stilwater-logov3`** logo centered on
white (generated via PowerShell System.Drawing; maskable variants use extra
safe-zone padding). `manifest.webmanifest` paths unchanged — only the files were
swapped. ⚠ An **already-installed PWA caches its icon** — to see the new one you
must **uninstall + reinstall** the app; *content/feature* changes still update
automatically (network-first `sw.js`).

### 20.2 Admin analytics portal DEPLOYED to Render (§19 → live)
The §19 portal (`admin-portal/` on branch **`stilwateradminportal`**) is now a
**live Render web service**:
- **Service:** `stilwater-admin-portal` (`srv-d8ht1eflk1mc73fgv6h0`), Node
  runtime, region oregon, **starter** plan, auto-deploys from branch
  `stilwateradminportal`. **URL: `https://stilwater-admin-portal.onrender.com`**.
  Build `cd admin-portal && npm install`; start `cd admin-portal && node server.js`.
- **Env vars set by us:** `SESSION_SECRET`, `ADMIN_PORTAL_EMAILS`
  (`bikramjit@stillwater.you,amar.dani@stillwater.you`), `ADMIN_PORTAL_PASSWORD`
  (`admin@1234#`), `ADMIN_PORTAL_MODEL` = **`anthropic/claude-sonnet-4.5`**,
  `NODE_ENV`. **User must paste two secrets** in the Render dashboard or it won't
  run: **`DATABASE_URL`** (prod Postgres Internal URL — ideally a read-only role,
  see `admin-portal/README.md`) and **`OPENROUTER_API_KEY`** (copy from
  `stillwater-main`). The server `process.exit`s without `DATABASE_URL`, so the
  first deploy crash-loops until both are added.
- Login → KPI cards + 14-day chart + the read-only NL-to-SQL chatbot.

### 20.3 New "Cobra Pose" yoga card (`831e078`, video `f517942` — live)
Third card in the AI Yoga intro grid (`care-path.html`): **Practice Cobra Pose**
(Bhujangasana) → `#yogaCobraOpen` → `#cobraModal`, a copy of the Balasana
3-stage flow (video → choice → practice). Guide video is
**`videos/CobraPoseCommon.mp4`** (swapped from the initial `SoniCobraPose.mp4`,
which is now unused). Same instrumentation: credit spend `cobra_watch_learn` +
`trackYogaClick("Cobra")`.
⚠ **"Practice Now" has NO detection URL yet** — in the Cobra IIFE in
`care-path.html`, `const POSE_APP_URL = "";`. While empty, Practice Now shows a
"coming soon" note; **set that constant to the real app URL** and it loads like
Tadasana/Balasana. (Tadasana = `static-tadasha-pose-detection-c3tk.onrender.com`,
Balasana = `static-chisld-pose-detection.onrender.com` for reference.)

### 20.4 Commits (newest first)
```
22d02db  Deploy: Cobra guide video -> CobraPoseCommon.mp4
c24cb9d  Deploy: add Cobra Pose card + flow
d24044c  Deploy: new PWA app icons + handoff §18/§19
(branch stilwateradminportal: admin portal app + claude-sonnet-4.5 default)
```

### 20.5 Open items (carried + new)
- **Cobra "Practice Now" URL** — set `POSE_APP_URL` in the Cobra IIFE when ready.
- **Admin portal:** add `DATABASE_URL` + `OPENROUTER_API_KEY` env on the Render
  service; consider the read-only `analytics_ro` DB role.
- Carried: OpenRouter credits / finish diabetes-book embed; domain cutover
  externals (`BASE_URL`/OAuth for stilwater.health, 301, retire stillwater.you).

---

## 21. 2026-06-07 — "SONI123" promo code → Soni yoga variant

A promo-code gate on the login page that, when used, shows a different
in-app yoga intro. **Client-side only** (a `localStorage` flag), no DB / API /
server change. Default (no code) behaviour is **completely unchanged**.

### 21.1 Auth page input (`auth.html` + twin `admin-served.html`)
- New **"Promo code (optional)"** text input added **below the "Continue with
  Google" CTA** (inside `#authChoices`, before the `OR` divider). Styled with
  the existing `.field-label` + `.form-input`; new `.auth-promo` wrapper (the
  input force-uppercases typed text, placeholder stays normal-case).
- On **clicking "Continue with Google"**, the input is read: if it equals
  **`SONI123`** (trimmed, case-insensitive) → `localStorage.setItem(
  "sw_promo_soni","1")`; **any other / empty value clears the flag**
  (`removeItem`). The flag is set synchronously in the click handler **before**
  the OAuth redirect, and `localStorage` on our origin **survives the Google
  OAuth roundtrip**, so it's still there when the user lands back in the app.
- ⚠ The promo is wired to the **Google CTA only** (per the request — "with
  continue with google"). The Mobile-Number flow does NOT set the flag.
- Both `auth.html` (the file served at `/auth.html`) and its twin
  `admin-served.html` got the identical input + CSS + JS.

### 21.2 Yoga intro variant (`care-path.html`)
A small IIFE `applySoniPromo()` (right before the Tadasana yoga IIFE) reads
`localStorage.sw_promo_soni`. **Only when `=== "1"`** it, on DOM ready:
- **Hides the Balasana card** in the AI Yoga intro grid (the card got
  `id="yogaBalasanaCard"`) → only **Practice Tadasana** + **Practice Cobra
  Pose** remain.
- Swaps the **Tadasana** guide video `#yogaVideo` src
  `videos/Tadasana.mp4` → **`videos/sonitadashana.mp4`** and calls `.load()`.
- Swaps the **Cobra** guide video `#cobraVideo` src
  `videos/CobraPoseCommon.mp4` → **`videos/SiniCobra.mp4`** and `.load()`.
- **Everything else is untouched** — same modals, "Watch & Learn", choice flow,
  Practice Now / Repeat, credit spend + `trackYogaClick` instrumentation.
- No flag (regular login, or wrong/blank code) → the present 3-card intro with
  the default videos. The swap is idempotent (guards on the filename).

The two video files (`videos/sonitadashana.mp4`, `videos/SiniCobra.mp4`) already
exist in the repo. (Note: the older `videos/SoniCobraPose.mp4` from §20 is the
deleted/unused one — the promo uses **`SiniCobra.mp4`**.)

### 21.3 Testing / reset
It's all browser state — to toggle by hand in DevTools console:
```js
localStorage.setItem("sw_promo_soni","1"); location.reload();  // force variant
localStorage.removeItem("sw_promo_soni");  location.reload();  // back to default
```
Or just log in via Google with / without `SONI123` in the promo field.

### 21.4 Open items (carried)
- Same as §20.5 (Cobra "Practice Now" `POSE_APP_URL` still empty; admin-portal
  `DATABASE_URL`/`OPENROUTER_API_KEY` env; OpenRouter credits / diabetes-book
  embed; domain cutover externals). All untouched this session.
- Promote `test → main` when ready — this is on `test` only.
- If the promo should ever be per-account (cross-device, reset on user delete),
  it must move server-side (a flag on the user + read at the yoga page) — same
  caveat as the §16 client-side credits prototype.

---

_Updated 2026-06-07 — added §21 ("SONI123" promo → Soni yoga variant, test only).
`main` `22d02db` ≈ `test` `f517942` (prod current); admin
portal LIVE at stilwater-admin-portal.onrender.com (branch
`stilwateradminportal`). Earlier: 2026-06-06 `1079e54`; 2026-06-05 GA4/domain
`a2a6252`, credits `db5733d`; 2026-06-04 (s2) `9f237ce`, 2026-06-04 `1aa5a68`;
2026-06-03 `169c40f`; 2026-06-01 `694011a`; 2026-05-30 `18dff27`._
