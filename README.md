# Stillwater Unified Stack

This repository now runs a simplified stack:

- Main website (Express) in the repo root
- Intake form flow on the main website (`/intake.html`)
- PostgreSQL database

## Local Development (Docker)

1. Set environment variables in a local .env file at the repo root:
   - SESSION_SECRET
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - ADMIN_EMAIL

2. Start all services:

   ```bash
   docker compose up --build
   ```

Services:

- Main website: http://localhost:3005
- Intake form: http://localhost:3005/intake.html

## Mobile UI DOM QA

The repository includes a Playwright matrix test to validate mobile and tablet UI behavior across public, customer, and admin states.

Coverage includes:

- Viewports: 320, 375, 480, 640, 768, 992, 1200, 1360
- Themes: dark and light
- States: logged-out, logged-in customer, logged-in admin
- Checks: horizontal overflow, off-screen header/nav controls, mobile border width sanity, mobile grid collapse

Run sequence:

1. Start stack:

   ```bash
   docker compose up --build -d
   ```

2. Seed deterministic admin account for test automation:

   ```bash
   npm run seed:test-admin
   ```

3. Install Playwright browser once:

   ```bash
   npm run test:mobile-ui:install
   ```

4. Execute DOM matrix:

   ```bash
   npm run test:mobile-ui
   ```

If Docker/DB is unavailable, run static UI matrix (no auth/backend dependency):

```bash
npm run test:mobile-ui:static
```

Optional environment variables:

- `PLAYWRIGHT_BASE_URL` (default `http://localhost:3005`)
- `TEST_ADMIN_PHONE` (default `9000000001`)
- `TEST_ADMIN_PASSWORD` (default `StillwaterAdmin#123`)

## Intake Flow

The old recommendation scoring flow is retired from active runtime.
The current form collects:

1. Name
2. Phone number
3. Age
4. Chronic conditions (diabetes, hypertension, depression, anxiety, sleep issues)
5. Eyesight issues and eye power
6. Relation if filling for a family member

Submissions are stored in the `intake_submissions` table in the main/public schema.

## Render Deployment Notes

- Deploy one web service (`stillwater-main`) and one managed PostgreSQL database.
- Remove recommendation-specific Render services/env vars.
- Set `COOKIE_DOMAIN` if you use a shared custom domain and need cookies available across subdomains.
