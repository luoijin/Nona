# Nona technology standards

## 1. Engineering baseline

Nona is an npm workspace monorepo with TypeScript at every application boundary. The Android client and API share product configuration and domain vocabulary through `packages/shared`.

| Area | Standard | Role |
|---|---|---|
| Mobile runtime | Android | Supported production platform |
| Mobile framework | React Native with Expo SDK 57 | Android application runtime |
| Mobile language | TypeScript | Type safety and shared contracts |
| API runtime | Node.js 20 LTS | Server runtime |
| API framework | Express 5 | HTTP transport |
| Database | PostgreSQL | Relational source of record |
| Hosted data platform | Supabase | PostgreSQL, Auth, Realtime, Storage |
| ORM | Prisma 6 | Type-safe database access and migrations |
| State | Zustand | Mobile local state |
| Navigation | Expo Router | File-oriented navigation capability |
| Speech MVP | `expo-speech` | On-device text-to-speech |
| Speech production | Google Cloud Speech services via backend | Higher-quality language support |
| Validation | Zod | Runtime environment and request validation |
| Security middleware | Helmet, CORS, rate limiting | HTTP hardening |
| Local infrastructure | Docker Compose | Reproducible PostgreSQL development |
| Deployment direction | EAS, Render/Railway, Supabase | Android and backend operations |

## 2. Dependency policy

- Pin framework major versions to the Expo SDK compatibility matrix.
- Use `npx expo install` for Expo-managed packages.
- Keep native modules compatible with Expo Go or explicitly document a development-build requirement.
- Do not introduce a dependency for functionality already provided by Expo, React Native, Node.js, or the shared package.
- Review dependency licenses and security advisories before production release.
- Keep secrets out of package manifests, source code, logs, and client bundles.

## 3. Mobile standards

The mobile app is Android-only and uses:

- Expo SDK 57
- Expo Router
- Expo Secure Store backed by Android Keystore
- Expo Speech
- Zustand
- Shared global configuration

The mobile application is a thin client. It renders policy decisions returned by the backend but does not implement fraud policy, hold banking credentials, or call banking providers directly.

## 4. Backend standards

The backend is an Express service with:

- Startup environment validation through Zod.
- Prisma as the only application database access layer.
- Supabase Auth token verification.
- User-scoped queries using the authenticated subject ID.
- Centralized security, transaction, and fraud policy configuration.
- Structured route, middleware, service, and integration boundaries.
- Graceful database disconnect on process termination.

## 5. Database operating modes

### Local mode

Local development uses PostgreSQL from `docker-compose.yml`. Prisma migrations create the application schema.

### Supabase mode

Hosted environments use a Supabase PostgreSQL connection string. Supabase Auth provides the user identity and the service-role client is restricted to the backend. Apply the SQL migration under `supabase/migrations` to enable RLS policies.

Prisma owns relational schema changes. Supabase migrations own hosted security policies and platform-specific SQL.

## 6. Voice architecture

The MVP uses Android on-device text-to-speech through `expo-speech`. Production voice services must be proxied by the backend so provider credentials are never distributed to the mobile application.

Supported product languages:

- English (`en`)
- Tagalog (`tl`)
- Cebuano (`ceb`)

## 7. Delivery controls

Before merging:

```bash
npm run mobile:typecheck
npm run backend:typecheck
npm --workspace apps/backend run build
```

Before production:

- Run dependency and container image vulnerability scans.
- Apply database migrations through a controlled release process.
- Verify RLS policies with authenticated and cross-user test cases.
- Verify Android release signing and secret handling.
- Exercise backup, restore, rollback, and incident procedures.
- Complete privacy, accessibility, and partner integration reviews.
