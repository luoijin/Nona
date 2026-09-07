# Nona system architecture

## 1. Architectural intent

Nona is an Android-only guided security layer for digital banking users who need more time, context, and confidence before completing a financial action.

The architecture is designed around four principles:

1. **Provider isolation** — banking and wallet APIs are called by the backend only.
2. **Deliberate confirmation** — risk assessment happens before provider execution.
3. **Data minimization** — Nona stores only the metadata required to provide guidance and safety.
4. **Accessible interaction** — the Android client uses large controls, localized copy, voice guidance, and high contrast.

## 2. Logical architecture

```text
┌──────────────────────────────────────────────┐
│ Android application                          │
│ Lola mode · voice · accessibility · settings │
└──────────────────┬───────────────────────────┘
                   │ HTTPS + Supabase JWT
                   ▼
┌──────────────────────────────────────────────┐
│ Nona API                                     │
│ Express · auth · validation · fraud policy   │
└─────────────┬───────────────────┬────────────┘
              │                   │
              ▼                   ▼
┌─────────────────────┐   ┌──────────────────────┐
│ PostgreSQL           │   │ External providers    │
│ Local or Supabase    │   │ Banking/wallet APIs   │
│ Prisma + RLS         │   │ Speech services      │
└─────────────────────┘   └──────────────────────┘
```

Supabase additionally provides Auth, Realtime, and Storage for hosted deployments. Those capabilities are accessed through explicit integration boundaries and are not mixed into mobile presentation logic.

## 3. End-to-end transaction flow

1. The user selects a supported action in the Android client.
2. The client requests transaction information or submits transaction intent to the backend.
3. The backend authenticates the Supabase JWT and derives the user identity from the verified token.
4. The backend validates the request against shared transaction configuration.
5. Fraud assessment evaluates amount, recipient state, urgency signals, and verification completeness.
6. The backend returns a localized, user-readable assessment and persists transaction metadata.
7. A blocked assessment cannot proceed to provider execution.
8. After explicit confirmation, a future provider adapter will execute the action server-side.
9. The backend records provider status and, in the hosted implementation, Supabase Realtime publishes status changes.
10. The Android client presents and reads the final result aloud when voice guidance is enabled.

## 4. Trust boundaries

### Android client

The client is an untrusted presentation and interaction surface. It may hold only a short-lived Supabase session token in Android Keystore-backed secure storage. It must not contain:

- Banking passwords or provider secrets.
- Supabase service-role credentials.
- Fraud thresholds that are authoritative for enforcement.
- Direct banking-provider API clients.

### API boundary

The API is the enforcement boundary. It validates all input, verifies identity, scopes queries by authenticated user ID, applies fraud policy, and owns provider credentials.

### Database boundary

Prisma provides application data access. Supabase PostgreSQL adds RLS as defense in depth for hosted environments. RLS policies use `auth.uid()` to restrict users to their own profile, settings, and transaction rows.

### Provider boundary

Provider adapters must be backend-only, independently authenticated, auditable, timeout-controlled, and idempotent. A provider response must never be trusted as proof that Nona's safety workflow was completed unless the backend has recorded the corresponding confirmation state.

## 5. Mobile architecture

```text
App.tsx
 ├── config          # environment overrides and shared configuration
 ├── components      # reusable accessible controls
 ├── screens         # Lola mode screens
 ├── services        # speech and native Android boundaries
 └── store           # user preferences and session state
```

The UI consumes shared localized content and design tokens. Screen code should not define product routes, fraud thresholds, API prefixes, or environment secrets.

Voice is an adapter: the current MVP uses Android `expo-speech`; production speech recognition and higher-quality synthesis will be proxied by the backend.

## 6. Backend architecture

```text
src/
├── config/           # validated environment and policy
├── db/               # Prisma lifecycle
├── integrations/     # Supabase and future provider clients
├── middleware/       # auth, errors, security
├── routes/           # transport-level request handling
├── services/         # domain logic
└── types/            # request and domain types
```

Routes should remain thin. Validation belongs at the transport boundary; domain policy belongs in services; persistence belongs behind Prisma; external systems belong behind integrations.

## 7. Persistence model

The initial relational model contains:

- `User` — identity reference and preferred language.
- `UserSettings` — voice, accessibility, and emergency preferences.
- `Transaction` — minimal transaction metadata, risk score, reasons, and status.
- `ScamPattern` — extensible server-side pattern definitions.

Nona intentionally does not model or persist bank passwords, PINs, complete account credentials, or unnecessary account data.

## 8. Availability and operations

Local development uses Docker PostgreSQL. Hosted environments use Supabase PostgreSQL with managed Auth, Realtime, and Storage. The API can be deployed to a Node-compatible service such as Render or Railway.

Production requirements:

- TLS from device to API.
- Managed secret storage and rotation.
- Database backups and tested restore procedures.
- Structured logs without sensitive financial data.
- Health checks and alerting.
- Request correlation IDs and audit events.
- Rate-limit monitoring.
- Controlled Prisma migration release process.
- Android signing-key protection.
- Security and privacy incident response.

## 9. Security and privacy controls

- No direct provider calls from Android.
- No banking credentials in client or Nona database.
- JWT verification through Supabase Auth.
- User ID sourced only from a verified token.
- Zod validation for environment and request input.
- Helmet, CORS, rate limiting, and body-size limits.
- Prisma relation scoping and Supabase RLS.
- Android Keystore-backed session storage.
- Data retention and deletion policies required before production.

## 10. Evolution path

The architecture supports incremental delivery:

1. Complete authentication and secure session lifecycle.
2. Add provider adapters behind the backend.
3. Add transaction confirmation state machine and idempotency keys.
4. Add server-side voice proxy and speech recognition.
5. Enable Supabase Realtime status updates.
6. Add observability, audit exports, partner controls, and formal compliance evidence.
