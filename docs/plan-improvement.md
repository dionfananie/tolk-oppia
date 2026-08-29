# Plan Improvement — Tolk-Oppia

Status: **PLANNED** — 2026-08-29
Repo: `~/project/tolk-oppia` (Bun, React Router 7 + Tailwind v4 + daisyUI 5, CF Worker + D1 `tolk_db`). Live: `https://tolk.oppia.world`.
Dibuat berdasar telisik struktur project saat ini (belum ada implementasi).

## 1. Google Auth (login & signup)
- OAuth client project `oppia-world` utk `tolk.oppia.world` (reuse pola Moozhaf `quran-hadis/workers/api/odoj.ts` + `workers/lib/session.ts` — Hono zero-dep).
- Tambah Hono app di worker (backend pertama Tolk): route /api/* → auth + relay.
- Endpoints: `GET /api/auth/google` (redirect, state CSRF + returnTo), `GET /api/auth/google/callback` (tukar code → userinfo → upsert `users` → cookie sesi HttpOnly), `GET /api/auth/me`, `POST /api/auth/logout`.
- Migration baru: tabel `sessions` + kolom profil pada `users` (name, avatar_url, google_sub).
- Signup == login (akun auto dari Google; baru = insert, lama = update).
- Frontend: ganti `login.tsx`/`signup.tsx` (form email/password placeholder) → tombol "Continue with Google" yang redirect ke `/api/auth/google?returnTo=…`. Header (`AppShell`) tampilkan avatar + logout bila login.
- Protector route `/app` & bawah (redirect ke /login bila belum login) — atau **hybrid** (main tanpa login utk BYOK lokal; feature server-key butuh login).

## 2. Provider/Model key → OpenRouter BYOK (bisa hampir semua model AI)
- Ganti `app/lib/providers.ts` (hardcoded `deepseek|glm|openai` + baseUrl) → **OpenRouter** sebagai jalur utama. `apiKey` = OpenRouter key (`sk-or-v1-…`). Hapus baseUrl (OpenRouter route semua model).
- Provider: `deepseek`, `z.ai` (Zhipu/GLM), `meta`, `chatgpt` (OpenAI), `claude` (Anthropic) — ini filter/preset model di OpenRouter, bukan endpoint sendiri.
- Model: id OpenRouter lengkap (`deepseek/deepseek-v4-flash`, `deepseek/deepseek-v4-pro`, dst). Verifikasi id valid dari `GET https://openrouter.ai/api/v1/models`.
- BYOK = bring-your-own-key: `Authorization: Bearer ***; OpenRouter nge-route ke model mana pun.

## 3. UI Provider/Model/Key
- `ProviderSetupForm` di-refactor: **dropdown provider** (deepseek/z.ai/meta/chatgpt/claude), **dropdown model** (preset per provider + opsi custom/free-text), **input text** utk key. Ganti model input-text bebas → dropdown.

## 4. Fix redundant key-flow
- Temuan: user harus masukin model API key berulang (tiap session/reload), tidak ada persist.
- Arah: **login sekali → key tersimpan server-side** (`api_keys` di tolk-db, terenkripsi AES-GCM `KEY_STORE_MASTER`) → tak perlu input lagi di device manapun (cross-device).
- Relay `/api/chat`: server decrypt key → call OpenRouter. Key TIDAK pernah keluar dari server.
- Fallback BYOK lokal (belum login): key di-persist localStorage.
- Satu form setting global (settings.tsx) dipakai semua halaman — bukan form per-halaman.

## 5. Key usage setelah login
- Login → `api_keys` terisi → semua chat pakai relay server key. Tak perlu key di client.

---

## Sumber & referensi
- OpenRouter BYOK SDK TS: `https://openrouter.ai/docs/client-sdks/typescript/sdks/byok/README#get`
- Blueprint auth: Moozhaf `quran-hadis/workers/api/odoj.ts`, `workers/lib/session.ts`.
- Infra siap: tolk-db (tolk_db), migration `0001_users_api_keys.sql` sudah ada, custom domain live.

## Blocker / catatan
- Set secrets via `wrangler secret put`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `SESSION_SECRET`, `KEY_STORE_MASTER`.
- Jangan commit secret.
- Perencanaan lebih detail + status progres akan di-update saat mulai implement (ganti status jadi IN_PROGRESS).

## Status progress
- [x] Telisik struktur project (routes, providers, storage, workers, theme, migrations, DB)
- [ ] Tabap A: backend auth Google Hono (/api/auth/*) + session
- [ ] Tabap B: refactor providers.ts → OpenRouter BYOK
- [ ] Tabap C: UI provider/model/key dropdown
- [ ] Tabap D: server-key storage (api_keys + /api/chat relay) + hapus redundant
- [ ] Tabap E: UI login/signup Google + protector
- [ ] Build/test/deploy to tolk.oppia.world
