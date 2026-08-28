# TOLK — BYOK (Bring Your Own Key)

Store API keys once, encrypted, in a Cloudflare D1 database, tied to an email/password account. All AI requests are proxied through the TOLK worker so the key never returns to the browser.

## Decisions

- **Auth:** full email/password accounts (login/signup become real; the current pages are placeholders).
- **Key storage:** Cloudflare **D1** database; keys encrypted **at rest** (envelope encryption).
- **Request path:** **server proxy** — the browser calls `POST /api/chat`; the worker decrypts the user's key and calls DeepSeek/GLM. No key in the browser; `GET /api/keys` returns metadata only.
- **Sessions:** opaque token in an **HttpOnly SameSite=Lax cookie** (`tolk_session`); DB stores the token's SHA-256 hash; 30-day expiry.
- **Password hashing:** **PBKDF2-SHA256**, 100k iterations, per-user salt (Workers-native; scrypt is not in `SubtleCrypto`).
- **Encryption:** **envelope** — a random per-user data key (AES-GCM), wrapped by a `TOLK_MASTER_KEY` Worker Secret; each provider key is encrypted with the user's data key. IVs stored alongside ciphertext.
- **Out of scope (this pass):** practice sessions/history stay in the browser; rate limiting, password reset, and OAuth are follow-ups.

## Backend

### Infra

- `wrangler d1 create tolk-oppia-db` → add binding to `wrangler.json`:

  ```json
  "d1_databases": [
    { "binding": "DB", "database_name": "tolk-oppia-db", "database_id": "<id>" }
  ]
  ```

- Secret: `wrangler secret put TOLK_MASTER_KEY` (32-byte key) + `TOLK_MASTER_KEY` in `.dev.vars` for local dev.
- Migrations applied via `wrangler d1 migrations apply tolk-oppia-db`.

### Schema — `migrations/0001_init.sql`

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  data_key_enc  BLOB NOT NULL,
  data_key_iv   BLOB NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE api_keys (
  user_id     TEXT NOT NULL,
  provider    TEXT NOT NULL,
  model       TEXT NOT NULL,
  key_enc     BLOB NOT NULL,
  key_iv      BLOB NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, provider)
);
```

### Worker routing — `workers/app.ts`

Intercept `pathname.startsWith("/api/")` → API router; everything else → existing SSR handler. New modules:

- `workers/api.ts` — API router (auth, keys, chat proxy).
- `workers/crypto.ts` — PBKDF2 hash/verify, envelope encrypt/decrypt (AES-GCM via `crypto.subtle`), token generation.

### API surface

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/signup` | `{ email, password }` | Creates user + data key, sets session cookie |
| POST | `/api/auth/login` | `{ email, password }` | Verifies, sets session cookie |
| POST | `/api/auth/logout` | — | Clears session cookie |
| GET | `/api/auth/me` | — | Current user email (for `useAuth`) |
| GET | `/api/keys` | — | Metadata only: `{ provider, model, hasKey }`, never the secret |
| PUT | `/api/keys` | `{ provider, model, apiKey }` | Upsert; encrypts before write |
| DELETE | `/api/keys` | — | Removes the key |
| POST | `/api/chat` | `{ provider, model, messages, options }` | Proxy to DeepSeek/GLM with the user's saved key; returns `{ content }` |

## Client changes

- `app/lib/providers.ts`: `chat()` POSTs to `/api/chat` instead of the provider endpoint; `apiKey` drops out of the client `Setup`.
- `app/lib/auth.ts` (new): `signup`, `login`, `logout`, `me` via fetch with `credentials`; `useAuth()` hook exposing `{ user, loading, refresh, signOut }`.
- `login.tsx` / `signup.tsx`: call the API, show errors, redirect to `/app`; remove the "no account system yet" notes.
- `settings.tsx`: provider section shows saved-key status (from `GET /api/keys`); "Save & Connect" → `PUT /api/keys` (requires login); "Test Connection" tests the saved key via `/api/chat`. Account section shows signed-in email + real Sign out.
- `practice.tsx`, `practice-setup.tsx`, `dashboard.tsx`, `results.tsx`: the "connect provider" gate becomes "signed in and has a saved key" (server metadata) with a "Sign in to save your key" prompt.
- `ProviderSetupForm.tsx` + landing/footer copy: replace "never stored" claims with the honest "encrypted and stored with your account".

## Security properties

- No API key is ever written to `localStorage`, returned to the client, or logged.
- Keys are AES-GCM encrypted at rest under a per-user data key, wrapped by `TOLK_MASTER_KEY`.
- Passwords are PBKDF2-hashed with per-user salt.
- Session token is opaque and only its hash is stored; cookie is HttpOnly.
- Master-key rotation requires re-encrypting user data keys (documented follow-up).

## Rollout

1. D1 database + binding + migration + secret.
2. `workers/crypto.ts` + `workers/api.ts` + routing in `workers/app.ts`.
3. Client auth (`app/lib/auth.ts`, login/signup pages).
4. Proxy `chat()` + keys client; update settings, practice, dashboard, results gates.
5. Copy honesty pass across `ProviderSetupForm`, landing BYOK section, footer.
6. Verify: `wrangler d1 migrations apply`, `npm run typecheck`, `npm run build`, SSR smoke test; manual auth flow (signup → save key → restart → auto-connected → chat through proxy) and confirm the key never appears in browser network responses.

## Follow-ups (not in this pass)

- Practice sessions/history moved to D1.
- Rate limiting on auth/chat endpoints.
- Password reset and OAuth (Google/GitHub).
- Master-key rotation tooling.
