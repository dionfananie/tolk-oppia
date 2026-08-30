# Handover: Deepgram STT/TTS Multi-Provider (tolk-oppia)

> **Tanggal:** 2026-08-30 (session ini)
> **Status: SELESAI di tingkat kode + typecheck + build (npm run check lolos).** Tinggal uji live dengan Deepgram key asli (lihat §5). Commit & push dilakukan.
> **Cabang kerja:** `feat/deepgram-speech` (dari `master`).
> **Repo:** `/home/ubuntu/project/tolk-oppia`

---

## 1. Apa yang sedang dikerjakan

Migrasi/tambahan STT & TTS dari hanya **Web Speech API (browser)** menjadi **dua provider yang bisa dipilih**: `webspeech` (default, gratis, tanpa key) dan `deepgram` (butuh API key, kualitas lebih baik). Sumber spesifikasi: `deepgram-stt-tts-plan.md` (dikirim Edo).

**Keputusan arsitektur (sudah dikonfirmasi Edo):**
- **BYOK murni**: key Deepgram disimpan terenkripsi server (reuse tabel `user_ai_credentials`, provider id `deepgram`). Key **TIDAK pernah** dikirim ke browser. Konsisten dengan prinsip inti TOLK.
- **STT Deepgram = audio-proxy**: client streaming audio (MediaRecorder webm/opus) sebagai body fetch → Worker `/api/dg/transcribe` buka WebSocket outbound ke `wss://api.deepgram.com/v1/listen` → teruskan bytes → balikin transcript live via SSE. Tanpa Durable Objects, tanpa dependency baru.
- **TTS Deepgram = server-proxy**: `POST /api/dg/tts` → Worker pakai key user (decrypt server) → panggil Aura → balikin audio mp3.
- **Auto-fallback**: kalau Deepgram error saat runtime (no key / network / quota), otomatis swap ke Web Speech untuk sesi itu.

---

## 2. Yang SUDAH SELESAI (kode sudah di working tree)

### Server (`workers/`)
- **`workers/ai/deepgram.ts`** (BARU) — util Deepgram:
  - `DEEPGRAM_PROVIDER = "deepgram"` (konstanta id provider di tabel BYOK)
  - `testDeepgramKey(apiKey)` — validasi key via `GET /api/deepgram.com/v1/projects`, return boolean.
  - `deepgramSpeak(apiKey, text, voice)` — TTS, return Response audio/mpeg atau Response JSON error.
  - `streamTranscribe(apiKey, body, params)` — STT proxy: buka outbound WS Deepgram, pompa audio, kembalikan `ReadableStream` SSE berisi event `{type: interim|final|utteranceEnd|error}`.
- **`workers/api/deepgram.ts`** (BARU) — Hono app, 3 endpoint:
  - `GET /api/dg/status` → `{ hasKey: boolean }` (login wajib)
  - `POST /api/dg/tts` → body `{text, voice?}`, login wajib, decrypt key → `deepgramSpeak`
  - `POST /api/dg/transcribe` → body = audio stream, login wajib, kembalikan SSE.
- **`workers/api/auth.ts`** (EDIT) — `deepgram` jadi provider valid untuk BYOK:
  - `/keys/test`: jika provider `deepgram` → pakai `testDeepgramKey`, bukan `testKey`.
  - `/keys` (save): cabang khusus deepgram — validasi via `/projects`, model = `""`, baseURL = `undefined`. Logika umum `getProvider`/`testKey` tetap untuk provider chat.
- **`workers/app.ts`** (EDIT) — mount `deepgramApp` ke `apiApp` (`apiApp.route("/", deepgramApp)`).

### Frontend (`app/lib/speech/` — semua BARU)
- **`types.ts`** — kontrak `STTController` / `TTSController` / `SpeechProvider = "webspeech" | "deepgram"`.
- **`providers/webspeech-stt.ts`** — wrap `createRecognizer` dari `lib/speech.ts` ke kontrak.
- **`providers/webspeech-tts.ts`** — wrap `speak`/`stopSpeaking`.
- **`providers/deepgram-stt.ts`** — client audio-proxy: `getUserMedia` + `MediaRecorder` (webm/opus) → push chunk ke `ReadableStream` body → `fetch POST /api/dg/transcribe` → `parseSse()` update transcript/interim. Juga export `fetchHasDeepgramKey()`.
- **`providers/deepgram-tts.ts`** — `POST /api/dg/tts` → `Audio` play. Export `DEEPGRAM_VOICES` (Aura list).
- **`useSTT.ts`** — facade: panggil kedua hook, kembalikan controller aktif + auto-fallback.
- **`useTTS.ts`** — facade TTS + auto-fallback per-ucapan.
- **`useSettings.ts`** — hook `useSpeechSettings()` (useSyncExternalStore + localStorage) untuk baca/tulis `sttProvider`, `ttsProvider`, `deepgramVoice`.
- **`index.ts`** — barrel export.

### Storage (`app/lib/storage.ts` — EDIT)
- `Settings` + `DEFAULT_SETTINGS` ditambah 3 field: `sttProvider`, `ttsProvider` (default `"webspeech"`), `deepgramVoice` (default `"aura-asteria-en"`).
- `loadSettings()` mem-parse field baru dengan fallback aman.
- Tipe export `SpeechProviderChoice = "webspeech" | "deepgram"`.

---

## 3. Yang SUDAH BERES (lanjutan dari session ini)

- [x] **Settings UI** — section "Voice" ditulis ulang: dropdown STT & TTS engine (Browser/Deepgram), picker voice Aura saat TTS=deepgram, sub-panel API key Deepgram (alur BYOK `saveServerKey`, badge status, login prompt), tetap pakai pola row + `selectClass`/`inputClass`/`Badge` yang sudah ada. "Test Voice" kini via facade `useTTS` sehingga menghormati provider terpilih.
- [x] **Adapt practice.tsx** — ganti `createRecognizer`/`speak`/`stopSpeaking` dengan facade `useSTT()`/`useTTS()`. Auto-fallback aktif; `onFinal` diteruskan dari facade untuk tetap auto-send ucapan (kontrak `STTController.start` & `TTSController.speak` diperluas dengan `onFinal`/`onEnd` opsional, tidak merusak).
- [x] **Typecheck & build** — `npm run typecheck` & `npm run check` LULUS (build + wrangler dry-run OK). CSS `@property` warning = pre-existing, bukan error.
- [x] **commit & push** di branch `feat/deepgram-speech` dari `master`.

**Perubahan penting selama integrasi:**
- `app/lib/speech.ts` **di-rename → `app/lib/speech-core.ts`** agar tidak bentrok dengan folder barrel `app/lib/speech/index.ts` (import `~/lib/speech` semula resolve ke file `speech.ts`, bukan dir). Update import di `webspeech-stt.ts`, `webspeech-tts.ts`, `practice-setup.tsx`. Barrel `~/lib/speech` kini juga re-export util `speech-core` (getVoices, isTtsSupported, dll).
- Kontrak diperluas: `STTController.start(opts?: { onFinal? })` dan `TTSController.speak(..., { onEnd? })`, di-wire core provider supaya UX practice (auto-send + orb reset) tetap jalan.
- Fix bug `useTTS`: provider aktif sebelumnya selalu `"deepgram"` (state `fallback` diset default), kini `provider = fallback ?? settings.ttsProvider`.

---

## 4. Concern / catatan teknis buat lanjutan

- **Endpoint `/dg/transcribe`** dibuat sebagai IIFE async di dalam handler Hono (untuk bisa `await` auth+decrypt sambil tetap return streaming Response). Perlu dipastikan Hono menerima tipe ini — kalau ada error type, refactor jadi middleware auth dulu lalu handler murni.
- **Belum ada rate limit** di `/api/dg/tts` & `/api/dg/transcribe`. Chat sudah punya pola in-memory rate limit (`workers/api/chat.ts`) — tiru untuk proteksi kuota.
- **`useSTT` facade** punya operator precedence yang sudah diperbaiki (`provider = fallback ?? selectedProvider`). Cek ulang saat typecheck.
- **`fallback` di facade** sifatnya per-session (tidak persist), sesuai plan. UI badge perlu tetap menampilkan provider yang benar (dari facade).
- **File asli `app/lib/speech.ts` TIDAK diubah** — hanya dibungkus oleh provider baru via import. Jangan hapus, masih dipakai practice.tsx (belum diadaptasi).
- **MediaRecorder di Safari/iOS**: `audio/webm;codecs=opus` tidak didukung di semua Safari. Provider deepgram-stt sudah fallback ke `audio/webm`, tapi kalau target user iOS perlu fallback encoding lain (plan §6).
- **Belum ada uji live** — tidak ada Deepgram key di server. Verifikasi terbatas ke typecheck + build. Untuk uji end-to-end butuh key asli dari `console.deepgram.com`.

---

## 5. Cara uji / verifikasi (nanti)

1. `npm run typecheck` (atau `npm run check`).
2. Jalankan dev: `npm run dev`.
3. Login Google (key BYOK butuh login).
4. Settings → AI providers → tambah provider `deepgram` pakai key asli (harus lolos validasi `/projects`).
5. Settings → Voice → set STT/TTS ke Deepgram, pilih voice Aura → Test Voice.
6. Practice mode voice → bicara → transcript dari Deepgram. Lalu matikan key / buat gagal → pastikan auto-fallback ke browser.
7. Deploy (saat mau prod): ikuti pola di `~/.hermes/memories/MEMORY.md` (export `CLOUDFLARE_API_TOKEN_AW`); add secret `KEY_STORE_MASTER` sudah ada.

---

## 6. File yang terlibat (ringkas)

| File | Status |
|---|---|
| `workers/ai/deepgram.ts` | BARU |
| `workers/api/deepgram.ts` | BARU |
| `workers/api/auth.ts` | EDIT |
| `workers/app.ts` | EDIT |
| `app/lib/speech.ts` | RENAME → `app/lib/speech-core.ts` (bentrok nama dgn dir barrel) |
| `app/lib/speech/*` (11 file) | BARU (index/useSettings/useSTT/useTTS/types + 4 provider) |
| `app/lib/storage.ts` | EDIT |
| `app/routes/settings.tsx` | EDIT (section Voice baru + BYOK deepgram) |
| `app/routes/practice.tsx` | EDIT (pakai facade useSTT/useTTS) |
| `app/routes/practice-setup.tsx` | EDIT (import speech-core) |
| `plan/deepgram-stt-tts-handover.md` | EDIT (status) |
