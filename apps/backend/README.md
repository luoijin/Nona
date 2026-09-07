# Nona backend service

The Nona backend is the trusted server boundary for identity verification, user-scoped data access, fraud assessment, and future banking-provider integrations.

When a user completes phone OTP authentication on Android, the client sends the Supabase access token as a bearer token to `PUT /api/profile`. The backend verifies that token, derives the user ID from Supabase Auth, and creates or updates the corresponding Prisma `User` record. The client never sends a user ID for authorization. Nona's separate four-digit MPIN is stored only as a salted `scrypt` hash.

## Responsibilities

- Verify Supabase Auth bearer tokens.
- Maintain user profiles and settings.
- Assess transaction risk before a transaction can proceed.
- Persist transaction metadata without storing banking credentials.
- Provide a stable REST API to the Android client.
- Support local PostgreSQL and Supabase PostgreSQL through one Prisma data layer.

## Runtime configuration

Copy `.env.example` to `.env`. Configuration is validated before the server starts.

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Runtime environment |
| `PORT` | HTTP listen port |
| `API_PREFIX` | API namespace |
| `DATABASE_MODE` | `local` or `supabase` |
| `DATABASE_URL` | PostgreSQL connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Auth verification client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend-only privileged key |
| `CORS_ORIGINS` | Allowed origins |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window |
| `RATE_LIMIT_MAX` | Requests allowed per window |

Never expose `SUPABASE_SERVICE_ROLE_KEY`, database credentials, banking-provider secrets, or OAuth secrets to the Android application.

## Local database workflow

```bash
docker compose up -d postgres
cp apps/backend/.env.example apps/backend/.env
npm run backend:prisma:generate
npm run backend:prisma:migrate
npm run backend:dev
```

During local development, set `EXPO_PUBLIC_DEV_OTP=true` in the mobile environment. The backend generates a six-digit OTP in memory, returns it to the mobile app in a clearly labeled development banner, expires it after five minutes, and limits verification attempts. This route is disabled whenever `NODE_ENV` is not `development`; it is not a production SMS replacement.

The default local connection is:

```text
postgresql://nona:nona@localhost:5432/nona
```

## Supabase workflow

Set:

```env
DATABASE_MODE=supabase
DATABASE_URL=<supabase-pooler-connection-string>
SUPABASE_URL=<project-url>
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Generate the Prisma client and apply the Prisma migration against the target database. Then apply `supabase/migrations/20260905000000_initial_rls.sql` through the Supabase SQL editor or Supabase CLI.

RLS policies restrict profile, settings, and transaction rows to `auth.uid()`. The service role bypasses RLS and is therefore restricted to trusted backend execution.

## API contract

All protected endpoints require:

```http
Authorization: Bearer <supabase-access-token>
```

### Health

```http
GET /api/health
```

Returns service status, environment, and active database mode. It does not expose secrets or connection strings.

### Profile

```http
GET /api/profile
PUT /api/profile
PUT /api/profile/mpin
PUT /api/profile/complete
POST /api/profile/mpin/verify
```

Supported update fields:

```json
{
  "fullName": "Maria Santos",
  "preferredLanguage": "ceb",
  "phone": "+639171234567",
  "emergencyContact": "+639181234567"
}
```

`PUT /api/profile/mpin` sets or replaces the authenticated user's MPIN. `POST /api/profile/mpin/verify` verifies an MPIN and is limited to five attempts per fifteen minutes. MPIN values are never returned or logged.

Signup uses `PUT /api/profile/complete` to persist the required name, emergency contact, language, phone, and MPIN in one database transaction. No user or settings row is created by an incomplete OTP or MPIN step.

Development login only succeeds when the canonical phone number already has a completed `User` record with an MPIN hash. It cannot create accounts, and login attempts are rate-limited.

### Transactions

```http
GET /api/transactions
POST /api/transactions/assess
```

Assessment input:

```json
{
  "amount": 2500,
  "type": "transfer",
  "recipientLabel": "Ana",
  "recipientRef": "verified-recipient-reference",
  "isNewRecipient": false,
  "urgentLanguage": false
}
```

The backend stores the assessment and marks the transaction `blocked` when the centralized fraud threshold is reached. This endpoint assesses and records intent; provider execution is a separate controlled integration and must not bypass assessment.

## Security controls

- Helmet security headers.
- Explicit CORS origin configuration.
- Global request rate limiting.
- JSON body-size limit.
- Zod request validation.
- Supabase JWT verification.
- User ID derived from the verified token, never from request input.
- Prisma relations scoped to the authenticated user.
- PostgreSQL RLS for Supabase direct-access defense in depth.
- No banking credentials in database models or client configuration.

## Operations

```bash
npm run backend:typecheck
npm --workspace apps/backend run build
npm run backend:dev
```

Production deployment must provide managed secrets, TLS termination, database backups, structured logs, health monitoring, migration controls, and an incident-response process.
