# Nona — Signup & Login Flows

*Modeled on GCash's mobile number → OTP → MPIN pattern, adapted for elderly users*

GCash's actual account flow is: mobile number → SMS OTP → set a 4-digit MPIN → basic KYC info, with fuller ID verification gating higher transaction limits. Nona mirrors that same shape deliberately — users already have muscle memory for "number, code, PIN" from GCash, so reusing it instead of inventing a new pattern removes a whole category of relearning. The additions on top of GCash's flow are the gaps called out in the concept paper: an emergency contact captured at signup (not something GCash asks for), and voice narration at every step instead of relying on trust in on-screen text.

---

## Signup flow

```
┌───────────────────────────────────┐
│ 1. Enter mobile number             │
│    Same number linked to GCash/Maya│
└──────────────────┬──────────────────┘
                    ▼
┌───────────────────────────────────┐        ┌───────────────┐
│ 2. Verify OTP                      │◄──────►│ Resend OTP     │
│    6-digit SMS code, read aloud     │        │ (60s cooldown) │
└──────────────────┬──────────────────┘        └───────────────┘
                    ▼
┌───────────────────────────────────┐
│ 3. Set 4-digit MPIN                 │
│    Entered twice, voice confirms    │
│    match                            │
└──────────────────┬──────────────────┘
                    ▼
┌───────────────────────────────────┐
│ 4. Add basic info                   │
│    Full name, birthdate, language   │
└──────────────────┬──────────────────┘
                    ▼
┌───────────────────────────────────┐
│ 5. Add emergency contact            │
│    A trusted family member's number │
└──────────────────┬──────────────────┘
                    ▼
┌───────────────────────────────────┐
│ 6. Link a banking app               │
│    OAuth2 to GCash, Maya, or a bank │
└──────────────────┬──────────────────┘
                    ▼
┌───────────────────────────────────┐
│ 7. Account ready                    │
│    Voice welcome, Lola mode home    │
│    screen                           │
└───────────────────────────────────┘
```

### Steps

1. **Enter mobile number** — the same number the user's GCash/Maya account is registered to.
2. **Verify OTP** — a 6-digit SMS code, read aloud by the voice module rather than left as silent on-screen text. If the code is wrong or expires, "Resend OTP" is offered after a 60-second cooldown.
3. **Set a 4-digit MPIN** — entered twice; the voice module confirms the two entries match before continuing. This is Nona's own credential, separate from the OAuth session with the banking partner.
4. **Add basic info** — full name, birthdate, and preferred language (Cebuano, Tagalog, or English), kept intentionally minimal.
5. **Add emergency contact** — a trusted family member's number, which later powers the one-tap emergency-assistance button.
6. **Link a banking app** — the OAuth2 handshake with GCash, Maya, or a bank, happening only after the MPIN is set so a stolen phone with the app installed still can't reach this step without it.
7. **Account ready** — a spoken welcome message, then the user lands on the Lola mode home screen.

---

## Login flow

```
┌───────────────────────────────────┐
│ 1. Open app                         │
│    Nona greets the user by voice    │
└──────────────────┬──────────────────┘
                    ▼
┌───────────────────────────────────┐
│ 2. Enter mobile number              │
│    Or tap a saved account           │
└──────────────────┬──────────────────┘can you 
                    ▼
┌───────────────────────────────────┐        ┌───────────────┐
│ 3. Enter MPIN or biometric          │◄──────►│ Forgot MPIN?   │
│    Fingerprint / Face ID optional   │        │                │
└──────────────────┬──────────────────┘        └───────────────┘
                    ▼
┌───────────────────────────────────┐
│ 4. Logged in                        │
│    Voice reads balance, home        │
│    screen opens                     │
└───────────────────────────────────┘
```

### Steps

1. **Open app** — Nona greets the user by voice on launch.
2. **Enter mobile number** — or tap a previously saved account, for returning users.
3. **Enter MPIN or biometric** — the same MPIN set at signup, or fingerprint/Face ID if enabled. Login does not send an OTP during normal use. "Forgot MPIN?" routes back through the OTP step from signup, then forces a new MPIN — the same recovery pattern GCash uses, again for familiarity.
4. **Logged in** — voice reads a balance summary, then the Lola mode home screen opens.

---

## Local development OTP mode

Because this project is being tested locally without paid SMS delivery, Nona supports a development-only OTP path:

1. Set `NODE_ENV=development` in `apps/backend/.env`.
2. Set `EXPO_PUBLIC_DEV_OTP=true` in `apps/mobile/.env`.
3. Enter a valid Philippine number in the `+63` UI field.
4. Tap **Send code**.
5. The backend generates a random six-digit code and the mobile app displays it in a clearly labeled **DEVELOPMENT OTP** banner.
6. Enter the code, then continue through MPIN setup or verification.

Development OTP controls:

| Control | Behavior |
|---|---|
| Storage | In-memory only; codes disappear when the backend restarts |
| Expiry | Five minutes |
| Attempts | Five verification attempts |
| Session | Temporary development bearer session, valid for 24 hours |
| Production | Development OTP routes return `404` outside `NODE_ENV=development` |

This mode is intentionally not SMS verification. It is suitable for personal physical-device testing only and must not be treated as proof of phone ownership.

## Implementation notes

- **OTP** — Supabase Auth supports phone-based OTP natively (`supabase.auth.signInWithOtp({ phone })`), so this step doesn't require custom SMS logic.
- **Local OTP** — when development mode is enabled, the mobile app calls `POST /api/dev-auth/otp` and `POST /api/dev-auth/verify` instead of Supabase SMS. The backend generates and validates the code; the mobile app never generates it.
- **Different login path** — signup uses phone → development OTP → MPIN → profile completion. Login uses phone → MPIN and calls `POST /api/dev-auth/login`; it does not issue a new OTP for every login.
- **Registered accounts only** — development login queries the existing `User` row by canonical phone number and requires a stored MPIN hash. It never creates a profile during login; unregistered numbers receive the same generic invalid-login response.
- **Duplicate signup prevention** — the signup OTP endpoint checks the database before generating a code. If the phone number is already registered, it returns `409` and no OTP is issued.
- **MPIN** — separate from the Supabase Auth or development session token. Store only a salted `scrypt` hash in the `users` table via Prisma, never the PIN itself. The MPIN is an additional backend gate.
- **Emergency contact** — written to `user_settings.emergency_contact` at signup.
- **Banking link** — the OAuth2 step described in `nona-system-architecture.md`, gated behind MPIN entry.
- **Forgot MPIN** — reuses the signup OTP step, then requires setting a new MPIN.

Unlike GCash, Nona's login doesn't need its own account-recovery infrastructure built from scratch — it leans on Supabase Auth's built-in OTP/session handling and only needs the thin MPIN layer on top, which is a meaningful scope reduction for a solo developer.

## API endpoints

| Endpoint | Purpose | Availability |
|---|---|---|
| `POST /api/dev-auth/otp` | Generate a local development OTP | Development only |
| `POST /api/dev-auth/verify` | Verify the local OTP and issue a temporary session | Development only |
| `POST /api/dev-auth/login` | Authenticate an existing local account with phone and MPIN | Development only |
| `PUT /api/profile/mpin` | Set or replace the MPIN hash | Authenticated |
| `POST /api/profile/mpin/verify` | Verify the MPIN | Authenticated; five attempts per 15 minutes |