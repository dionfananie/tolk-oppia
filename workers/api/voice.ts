import { Hono } from "hono";
import { getSessionUser } from "../lib/session";
import { getOrCreateEntitlement, recordUsage } from "../lib/entitlements";
import { resolvePlatformVoice } from "../lib/credentials-platform";
import { resolveUserCredential } from "../lib/credentials-user";
import { deepgramSpeak, transcribeRecording } from "../ai/deepgram";
import { qwenSpeak, qwenTranscribe } from "../ai/qwen";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
	status,
	headers: { "content-type": "application/json", "cache-control": "no-store" },
});

export const voiceApp = new Hono<{ Bindings: Env }>();

async function user(c: { env: Env; req: { raw: Request } }) {
	return getSessionUser(c.env.tolk_db, c.req.raw);
}

async function deepgramUserKey(db: D1Database, master: string, userId: string): Promise<string | null> {
	const credential = await resolveUserCredential(db, master, userId, "deepgram");
	return credential?.apiKey ?? null;
}

voiceApp.get("/voice/status", async (c) => {
	const userId = await user(c);
	if (!userId) return json({ error: "unauthorized" }, 401);
	const entitlement = await getOrCreateEntitlement(c.env.tolk_db, userId);
	return json({
		plan: entitlement.planId,
		ttsProvider: entitlement.planId === "voice" ? "qwen" : "deepgram",
		sttProvider: entitlement.planId === "voice" ? "qwen" : "deepgram",
	});
});

voiceApp.post("/voice/tts", async (c) => {
	const userId = await user(c);
	if (!userId) return json({ error: "unauthorized" }, 401);
	const master = c.env.KEY_STORE_MASTER;
	if (!master) return json({ error: "KEY_STORE_MASTER is not configured" }, 500);
	const body = await c.req.json<{ text?: string; voice?: string }>().catch((): { text?: string; voice?: string } => ({}));
	const text = body.text?.trim() ?? "";
	if (!text) return json({ error: "text is required" }, 400);
	const entitlement = await getOrCreateEntitlement(c.env.tolk_db, userId);

	if (entitlement.planId === "voice") {
		const credential = await resolvePlatformVoice(c.env.tolk_db, master, "tts");
		if (!credential) return json({ error: "hosted_voice_not_configured" }, 503);
		const response = await qwenSpeak(credential.apiKey, text, body.voice || "Cherry");
		if (response.ok) await recordUsage(c.env.tolk_db, { userId, planId: entitlement.planId, kind: "voice", quantity: text.length, unit: "request", provider: "qwen", model: "qwen3-tts-flash", metadata: { characters: text.length } });
		return response;
	}

	const key = await deepgramUserKey(c.env.tolk_db, master, userId);
	if (!key) return json({ error: "no_deepgram_key" }, 404);
	return deepgramSpeak(key, text, body.voice);
});

voiceApp.post("/voice/transcribe", async (c) => {
	const userId = await user(c);
	if (!userId) return json({ error: "unauthorized" }, 401);
	const master = c.env.KEY_STORE_MASTER;
	if (!master) return json({ error: "KEY_STORE_MASTER is not configured" }, 500);
	const body = c.req.raw.body;
	if (!body) return json({ error: "audio is required" }, 400);
	const entitlement = await getOrCreateEntitlement(c.env.tolk_db, userId);
	if (entitlement.planId === "voice") {
		const credential = await resolvePlatformVoice(c.env.tolk_db, master, "stt");
		if (!credential) return json({ error: "hosted_voice_not_configured" }, 503);
		const audio = await c.req.raw.arrayBuffer();
		return qwenTranscribe(credential.apiKey, audio, c.req.header("content-type") ?? "audio/webm");
	}
	const key = await deepgramUserKey(c.env.tolk_db, master, userId);
	if (!key) return json({ error: "no_deepgram_key" }, 404);
	return transcribeRecording(key, body, c.req.header("content-type") ?? "audio/webm");
});
