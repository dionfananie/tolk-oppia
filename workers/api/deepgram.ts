// api/deepgram.ts — Endpoint baru utk Deepgram STT/TTS (BYOK server-proxy).
// Berbeda dari chat: Deepgram bukan OpenAI-compatible, jadi request speech
// langsung di sini, memakai key user dari `user_ai_credentials` (provider='deepgram').
// Key TIDAK pernah dikirim ke browser; semua panggilan Deepgram terjadi server-side.
//
// Endpoint:
//   POST /api/dg/tts          { text, voice? }                -> Response audio/mpeg
//   POST /api/dg/transcribe   body = recorded microphone audio -> Response JSON transcript
//   GET  /api/dg/status       -> { hasKey: boolean }
//
// Semua butuh login (session cookie). Disusun sebagai Hono app terpisah dari chat.

import { Hono } from "hono";
import { decryptKey } from "../lib/crypto";
import { getSessionUser } from "../lib/session";
import { deepgramSpeak, transcribeRecording } from "../ai/deepgram";

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});

export const deepgramApp = new Hono<{ Bindings: Env }>();

// CSRF safety: semua mutasi butuh login; session cookie SameSite=Lax mencegah cross-site.
async function authUser(c: { env: Env; req: { raw: Request } }): Promise<string | null> {
	return getSessionUser(c.env.tolk_db, c.req.raw);
}

/** Ambil + decrypt key Deepgram milik user. Return null bila belum ada. */
async function deepgramKey(c: { env: Env; req: { raw: Request } }, userId: string): Promise<string | null> {
	const master = c.env.KEY_STORE_MASTER;
	if (!master) return null;
	const row = await c.env.tolk_db
		.prepare(
			`SELECT encrypted_api_key, iv FROM user_ai_credentials
			 WHERE user_id = ? AND provider = ?`,
		)
		.bind(userId, "deepgram")
		.first<{ encrypted_api_key: string; iv: string }>();
	if (!row) return null;
	return decryptKey(row.encrypted_api_key, row.iv, master);
}

// GET /api/dg/status — apakah user punya key Deepgram tersimpan (untuk UI toggle).
deepgramApp.get("/dg/status", async (c) => {
	const userId = await authUser(c);
	if (!userId) return json({ hasKey: false, error: "unauthorized" }, 401);
	const key = await deepgramKey(c, userId);
	return json({ hasKey: Boolean(key) });
});

// POST /api/dg/tts — proksi TTS: key user dipakai server utk panggil Aura, audio dikirim ke client.
deepgramApp.post("/dg/tts", async (c) => {
	const userId = await authUser(c);
	if (!userId) return json({ error: "unauthorized, sign in required" }, 401);

	const key = await deepgramKey(c, userId);
	if (!key) {
		return json(
			{ error: "no_deepgram_key", message: "Save a Deepgram API key in Settings to use Deepgram TTS." },
			404,
		);
	}

	const body = await c.req
		.json<{ text?: string; voice?: string }>()
		.catch(() => ({ text: undefined, voice: undefined }));
	const text = (body.text ?? "").trim();
	if (!text) return json({ error: "text is required" }, 400);

	// Rate limit kecil per user agar abuse tidak merusak kuota.
	return deepgramSpeak(key, text, body.voice);
});

deepgramApp.post("/dg/transcribe", async (c) => {
	const userId = await authUser(c);
	if (!userId) return json({ error: "unauthorized", message: "Sign in to use Deepgram speech recognition." }, 401);

	const key = await deepgramKey(c, userId);
	if (!key) {
		return json(
			{ error: "no_deepgram_key", message: "Save a Deepgram API key in Settings to use Deepgram speech recognition." },
			404,
		);
	}
	const body = c.req.raw.body;
	if (!body) return json({ error: "bad_request", message: "No microphone audio was received." }, 400);

	return transcribeRecording(key, body, c.req.header("content-type") ?? "audio/webm");
});
