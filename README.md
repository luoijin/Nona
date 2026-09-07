# Nona

## Android financial safety layer for older adults

Nona is a user-guided security layer for elderly digital banking users in the Philippines. It helps users review and understand financial actions before they continue in an existing wallet or banking application such as GCash, Maya, or a participating bank app.

Nona is not a bank, wallet, payment processor, or system of record for banking credentials. Its purpose is to add a clear, localized, voice-assisted safety checkpoint between a user's intention and a financial action.

> Every grandparent deserves to bank with confidence, not fear.

## Product objectives

- Reduce technology anxiety through a simplified Lola mode interface.
- Make transaction details understandable through English, Tagalog, and Cebuano voice guidance.
- Introduce deliberate confirmation checkpoints that slow down high-risk actions.
- Detect risk signals such as unusual amounts, new recipients, incomplete recipient verification, and urgency language.
- Provide a single, accessible emergency-assistance path.
- Support large text, high contrast, generous touch targets, and Android-native accessibility behavior.

## Current release scope

The repository currently contains:

- An Android-only React Native mobile client using Expo SDK 57 and TypeScript.
- A centralized shared configuration package used by the mobile client and backend.
- A Lola mode home experience with balance, payment, and load entry points.
- Voice read-aloud support through `expo-speech`.
- English, Tagalog, and Cebuano UI copy.
- High-contrast and voice-guidance preferences.
- An emergency dialer entry point.
- An Express and TypeScript backend with Prisma.
- Local PostgreSQL and Supabase PostgreSQL operating modes.
- Supabase Auth bearer-token verification.
- Profile and transaction APIs.
- Configurable fraud assessment and transaction blocking.
- Supabase Row Level Security migration definitions.

Banking-provider execution, production speech services, realtime transaction subscriptions, and production SMS delivery remain future integrations. The backend remains the only permitted boundary for banking-provider APIs.

## Repository structure

```text
nona/
├── apps/
│   ├── mobile/                 # Android React Native / Expo application
│   │   ├── src/
│   │   │   ├── components/     # Accessible UI primitives
│   │   │   ├── config/         # Mobile environment overrides
│   │   │   ├── screens/        # Application screens
│   │   │   ├── services/       # Native and external service boundaries
│   │   │   └── store/          # Zustand state
│   │   ├── app.config.js       # Android Expo manifest
│   │   └── .env.example
│   └── backend/                # Express API and Prisma data access
│       ├── src/
│       │   ├── config/         # Validated environment and policy config
│       │   ├── db/             # Prisma client lifecycle
│       │   ├── integrations/   # Supabase clients
│       │   ├── middleware/     # Authentication and error handling
│       │   ├── routes/         # HTTP API surface
│       │   └── services/       # Domain services, including fraud
│       ├── prisma/
│       │   └── schema.prisma
│       └── .env.example
├── packages/
│   └── shared/                 # Product configuration and localized content
├── supabase/
│   └── migrations/             # Hosted database security policies
├── docker-compose.yml          # Local PostgreSQL
└── package.json                # Workspace commands
```

## Architecture and security boundaries

```text
Android application
       │ HTTPS + Supabase JWT
       ▼
Express backend
       │
       ├── Supabase Auth verification
       ├── Fraud assessment and policy enforcement
       ├── Prisma data access
       └── Banking-provider integrations (server-side only)
       │
       ├── Local PostgreSQL (development)
       └── Supabase PostgreSQL, Realtime, and Storage (hosted)
```

The mobile client never calls a banking provider directly and never stores banking credentials. The backend owns provider credentials, transaction policy enforcement, and all sensitive integration logic. User-scoped database access is enforced in application queries and, for Supabase-hosted access, by PostgreSQL Row Level Security.

## Prerequisites

- Node.js 20 LTS or newer
- npm 10 or newer
- Docker Desktop or Docker Engine for local PostgreSQL
- Android phone with Expo Go SDK 57 for development
- Supabase project for authentication and hosted deployment

Nona targets Android only. The development computer and phone must be on the same local network when using Expo Go.

## Installation and local development

```bash
npm install
docker compose up -d postgres
cp apps/backend/.env.example apps/backend/.env
cp apps/mobile/.env.example apps/mobile/.env
npm run backend:prisma:generate
npm run backend:prisma:migrate
```

Start the services in separate terminals:

```bash
npm run backend:dev
npm run mobile:start
```

Use the computer's LAN IP in `apps/mobile/.env`, not `localhost`:

```env
EXPO_PUBLIC_API_URL=http://192.168.68.103:3000/api
```

Verify the API from the computer and from the phone browser:

```bash
curl http://localhost:3000/api/health
```

In Expo, select LAN mode and scan the QR code with the SDK 57 Android Expo Go application.

### Expo Go troubleshooting

If Expo Go stays on the loading screen after scanning:

1. Stop any previous Metro process.
2. Start the project from the repository root with `npm run mobile:start`.
3. Select **LAN** mode, not Tunnel or a stale QR code.
4. Confirm the phone and computer are on the same Wi-Fi network.
5. Open `http://<computer-lan-ip>:8081/status` in the phone browser; it should return `packager-status:running`.
6. Use `npx expo start --clear` if Metro has stale cache data.

The mobile app uses `App.tsx` directly through `expo/AppEntry.js`; it does not use an Expo Router route tree. This is intentional for the current single-screen MVP and prevents Expo Router typed-route startup failures.

## Authentication

The Android client uses a GCash-inspired phone number → OTP → four-digit MPIN flow. The phone input displays a fixed `+63` prefix and formats the remaining digits as `XXX XXX XXXX`. Signup additionally collects the user's name, preferred language, and trusted emergency contact.

For personal local testing, set `EXPO_PUBLIC_DEV_OTP=true` in the mobile environment and keep the backend at `NODE_ENV=development`. After **Send code**, the backend generates a six-digit OTP in memory and the mobile client displays it in a clearly labeled development banner. Codes expire after five minutes, allow five attempts, and are unavailable outside development mode. This bypasses paid SMS and does not verify real phone ownership.

For real phone verification, disable development OTP mode and configure Supabase Phone Auth with an SMS provider. Sessions are persisted through `expo-secure-store` backed by Android Keystore. The home screen is protected until a valid session and MPIN exist, and the Profile tab provides logout and settings.

After authentication, the client sends the Supabase access token to `PUT /api/profile`. The backend verifies the token and creates or updates the corresponding user account in PostgreSQL. Configure `EXPO_PUBLIC_API_URL` with the computer's LAN IP when testing on a physical Android phone.

Set these public client values in `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<public-anon-key>
```

Never place the Supabase service-role key, database password, or banking-provider credentials in the mobile environment.

## Configuration governance

Product configuration is shared through `packages/shared` and includes app identity, Android platform identity, routes, languages, localized copy, transaction types, limits, fraud thresholds, emergency defaults, and security defaults.

Environment configuration is validated at startup:

- `apps/mobile/.env` contains public client configuration and user-specific overrides.
- `apps/backend/.env` contains server configuration and secrets.
- Supabase service-role credentials are backend-only.
- Banking-provider credentials are backend-only.
- No credentials are committed to source control.

## Quality gates

```bash
npm run mobile:typecheck
npm run backend:typecheck
npm --workspace apps/backend run build
```

## Operational documentation

- [`apps/backend/README.md`](./apps/backend/README.md) — API, database modes, migrations, and deployment
- [`stack.md`](./stack.md) — technology standards and dependency policy
- [`nona-system-architecture.md`](./nona-system-architecture.md) — system design, trust boundaries, and data flows

## Roadmap

1. Complete Supabase authentication screens and secure session persistence.
2. Add transaction confirmation workflows and provider adapters behind the backend.
3. Add production-grade speech-to-text and text-to-speech proxy services.
4. Add Supabase Realtime transaction status updates.
5. Conduct usability and accessibility testing with senior users in Cebu City.
6. Establish production observability, incident response, privacy review, and partner onboarding controls.

## Privacy and compliance posture

Nona is designed around data minimization and Philippine Data Privacy Act considerations. It must not store banking passwords, full account credentials, or unnecessary financial data. A production release requires a formal privacy impact assessment, retention schedule, access review, security testing, provider agreements, and incident-response procedures.

## License and ownership

License: TBD.