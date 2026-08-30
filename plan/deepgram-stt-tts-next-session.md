# Handover: Deepgram STT/TTS — Sesi Lanjutan (fase uji & deploy)

> **Dibuat:** 2026-08-30 (session lanjutan dari `plan/deepgram-stt-tts-handover.md`)
> **Status: KODE + BUILD COMMITTED & PUSHED.** Belum: uji live (butuh Deepgram key), review UX, deploy.
> **Branch:** `feat/deepgram-speech` (di-push ke `origin/feat/deepgram-speech`). NO-PR YET.

---

## 1. Posisi saat ini (CEPAT)

- Branch fitur `feat/deepgram-speech` dibuat dari `master`, sudah **committed** (`a166ea1`) dan **pushed** ke origin.
- `npm run typecheck` LULUS, `npm run check` LULUS (tsc + react-router build + wrangler dry-run).
- Working tree BERSIH (tidak ada uncommitted).
- Belum dibuat PR. Belum deploy. Belum ada uji end-to-end (belum ada Deepgram key di server).

**Langkah terakhir yang baru dilakukan:** `git push -u origin feat/deepgram-speech` → branch ter-track remote.

---

## 2. Apa fitur ini (sudah rampung di kode)

Migrasi STT/TTS dari hanya Web Speech API (browser) menjadi **dua provider pilihan**: `webspeech` (default, tanpa key) dan `deepgram` (BYOK, kualitas lebih baik). Arsitektur yang sudah dikonfirmasi:

- **BYOK murni**: key Deepgram disimpan terenkripsi di server (tabel `user_ai_credentials`, provider id `deepgram`). Key TIDAK pernah ke browser.
- **STT Deepgram = audio-proxy**: browser streaming MediaRecorder webm/opus → `fetch POST /api/dg/transcribe` → Worker buka WS outbound `wss://api.deepgram.com/v1/listen` → teruskkan bytes → balikin transcript via SSE.
- **TTS Deepgram = server-proxy**: `POST /api/dg/tts` → Worker decrypt key user → panggil Aura → balikin audio mp3.
- **Auto-fallback**: kalau Deepgram error runtime → swap ke Web Speech untuk sesi/ucapan itu.

---

## 3. Yang sudah diselesaikan DI SESI INI (sejak handover pertama)

- [x] **Settings UI** (section Voice ditulis ulang): dropdown STT & Voice engine (Browser/Deepgram), picker voice Aura saat TTS=deepgram, sub-panel API key Deepgram (BYOK `saveServerKey`, badge status, tombol hapus, prompt login saat belum login), Test Voice lewat facade `useTTS`.
- [x] **Practice diadaptasi** ke facade `useSTT()`/`useTTS()` + auto-fallback + sinkronisasi listening + caption interim + penanganan error.
- [x] **Kontrak diperluas tanpa merusak**: `STTController.start(opts?: { onFinal? })`, `TTSController.speak(text, { onEnd? })` — di-wire ke provider supaya auto-send & reset orb tetap jalan.
- [x] **Fix bug `useTTS`**: provider aktif tadinya selalu `"deepgram"` → kini `provider = fallback ?? settings.ttsProvider`.
- [x] **Rename penting**: `app/lib/speech.ts` → `app/lib/speech-core.ts` (nama bentrok dengan folder barrel `app/lib/speech/`; import `~/lib/speech` semula resolve ke file lama, bukan dir). Barrel kini re-export util `speech-core`.
- [x] **Fix type di worker**: `workers/api/deepgram.ts` (`c.req.json().catch` fallback bertipe & `c.req.raw.body`).
- [x] **Typecheck & build** + **commit & push**.

---

## 4. File yang terlibat (final)

| File | Status |
|---|---|
| `workers/ai/deepgram.ts` | BARU |
| `workers/api/deepgram.ts` | BARU |
| `workers/api/auth.ts` | EDIT |
| `workers/app.ts` | EDIT |
| `app/lib/speech.ts` | RENAME → `app/lib/speech-core.ts` |
| `app/lib/speech/*` (11) | BARU: index, types, useSettings, useSTT, useTTS + 4 provider |
| `app/lib/storage.ts` | EDIT (3 field settings: sttProvider, ttsProvider, deepgramVoice) |
| `app/routes/settings.tsx` | EDIT (section Voice + BYOK deepgram) |
| `app/routes/practice.tsx` | EDIT (facade useSTT/useTTS) |
| `app/routes/practice-setup.tsx` | EDIT (import speech-core) |
| `plan/deepgram-stt-tts-handover.md` | EDIT (status) |

NOTE: `app/lib/speech/providers/` TIDAK punya barrel sendirian; yang jadi entry point adalah `app/lib/speech/index.ts`.

---

## 5. Yang BELUM — to-do sesi berikutnya (urut prioritas)

- [ ] **Uji live end-to-end (butuh Deepgram key asli).** Ini blocker utama sebelum deploy.
  - Cara: `npm run dev` → login Google (BYOK butuh login) → Settings → AI providers atau panel Deepgram di Voice → simpan key (lolos validasi `/projects`) → set STT/TTS = Deepgram, pilih voice Aura → Test Voice → Practice mode voice → bicara → transcript dari Deepgram. Lalu hapus key / buat gagal → pastikan auto-fallback ke browser.
  - Key dari `console.deepgram.com`. Belum ada di server; simulasi offline tidak bisa karena STT/TTS deepgram butuh API nyata.
- [ ] **Review UX oleh Edo** — sesi ini antislop diterapkan mode *during*. Edo suka detail/precision UI & menolak alur redundan. Siapkan tangkapan layar section Voice (+ practice) sebelum/bersamaan dengan uji live, minta konfirmasi arah jika ada yang ingin diubah.
- [ ] **Bikin PR** `feat/deepgram-speech` → master setelah uji lolos (link PR: https://github.com/dionfananie/tolk-oppia/pull/new/feat/deepgram-speech).
- [ ] **Deploy** ke prod saat final: pola di `~/notes/secrets/cloudflare-tolk.env` → source file → `export CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN_AW` → `npm run deploy`. Secret `KEY_STORE_MASTER` sudah ada; ensure `tolk_db` binding membaca provider deepgram (bukan hal baru, tabel sudah ada).

---

## 6. Potensi concern / hal yang dicek saat uji

- **MediaRecorder encoding**: `audio/webm;codecs=opus` tidak didukung semua Safari/iOS. Provider deepgram-stt sudah fallback ke `audio/webm` polos, tapi kalau target user iOS perlu encoding lain (plan §6 asli). Uji di Chrome dulu (paling stabil).
- **STT Deepgram (no-key) tidak auto-fallback via throw**: kalau Deepgram dipilih tapi key belum ada, `deepgram.start()` tidak me-reject (meng-set `error`/`isListening=false`), jadi facade TTS auto-fallback tidak aktif untuk STT — hanya `controller.error` yang tampil. Ini keputusan desain; user lihat error "Simpan key dulu". Bisa dipertimbangkan perbaikan nanti: facade cek `fetchHasDeepgramKey()` sebelum memilih deepgram.
  - TTS Deepgram (no-key): `deepgram.speak` akan throw (HTTP 404 `no_deepgram_key` → `setError` tapi tidak throw)... PERLU DICEK: kalau `deepgram.speak` tidak me-reject saat 404, facade capture `catch` tidak aktif → harusnya fallback ke webspeech. Ini titik uji penting (#5). Jika tidak throw → tambahkan deteksi: di `useDeepgramTTS`/facade, treat `!res.ok` sebagai throw agar auto-fallback jalan.
- **Auto-fallback & voice provider per-ucapan** (`useTTS`): tested reason; verifikasi manual dengan key yang tidak valid.
- **Barrel vs file nama**: JANGAN re-name `speech-core.ts` kembali ke `speech.ts`; itu akan memicu bentrok resolve lagi.

---

## 7. Rekomendasi cepat untuk sesi berikutnya

1. Minta/isi Deepgram API key Edo (dari console.deepgram.com).
2. Jalankan `npm run dev` + uji alur live (langkah §5).
3. Konfirmasi perilaku auto-fallback STT & TTS (titik concern §6).
4. Kalau di sekitar UX ada yang mau diubah → patch di branch yang sama, commit + push.
5. Setelah uji & UX oke → buat PR → deploy.

---

## 8. Konteks lingkungan (mau di-ingat)

- Repo: `/home/ubuntu/project/tolk-oppia` · Stack: React Router v7 + Hono + CF Workers (D1) · Bun/NPM.
- Server timezone Asia/Shanghai (UTC+8); waktu Edo WIB (UTC+7) = jam server − 1 jam.
- Workflow: branch fitur dari `master`, state committed & pushed; PR dibuat setelah verifikasi.
