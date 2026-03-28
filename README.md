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
