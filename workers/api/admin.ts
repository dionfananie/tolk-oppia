import { Hono } from "hono";
import { encryptKey } from "../lib/crypto";
import { getSessionUser } from "../lib/session";
import { getProvider, testKey } from "../ai/router";
import { qwenSpeak } from "../ai/qwen";

declare global {
	interface Env {
		TOLK_ADMIN_EMAIL?: string;
	}
}

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
	status,
	headers: { "content-type": "application/json", "cache-control": "no-store" },
});

export const adminApp = new Hono<{ Bindings: Env }>();

async function requireAdmin(c: { env: Env; req: { raw: Request } }): Promise<string | Response> {
	const userId = await getSessionUser(c.env.tolk_db, c.req.raw);
	if (!userId) return json({ error: "unauthorized" }, 401);
	const adminEmail = c.env.TOLK_ADMIN_EMAIL?.trim().toLowerCase();
	if (!adminEmail) return json({ error: "admin access is not configured" }, 503);
	const user = await c.env.tolk_db.prepare(`SELECT email FROM users WHERE user_id = ?`).bind(userId).first<{ email: string | null }>();
	if (!user?.email || user.email.toLowerCase() !== adminEmail) return json({ error: "forbidden" }, 403);
	return userId;
}

async function parseBody(c: { req: { json: <T>() => Promise<T>; header: (name: string) => string | undefined } }) {
	return c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
}

adminApp.get("/admin/config", async (c) => {
	const result = await requireAdmin(c);
	if (result instanceof Response) return result;
	try {
		const rows = await c.env.tolk_db.prepare(`SELECT scope, provider, label, default_model, stt_model, tts_model, base_url, key_hint, enabled, last_validated_at FROM platform_credentials_v2 ORDER BY scope`).all();
		return json({ configs: rows.results ?? [] });
	} catch {
		return json({ error: "platform credential migration is not applied" }, 503);
	}
});

adminApp.post("/admin/config/test", async (c) => {
	const result = await requireAdmin(c);
	if (result instanceof Response) return result;
	const body = await parseBody(c);
	const scope = body.scope === "voice" ? "voice" : body.scope === "llm" ? "llm" : "";
	const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
	if (!scope || !apiKey) return json({ error: "scope and apiKey are required" }, 400);
	try {
		if (scope === "llm") {
			const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : "deepseek-v4-flash";
			await testKey("deepseek", apiKey, model, typeof body.baseURL === "string" ? body.baseURL.trim() || undefined : undefined);
		} else {
			const tts = await qwenSpeak(apiKey, "test", "Cherry");
			if (!tts.ok) return json({ valid: false, error: `Qwen voice validation failed (HTTP ${tts.status})` }, 400);
		}
		return json({ valid: true });
	} catch (error) {
		return json({ valid: false, error: error instanceof Error ? error.message : "Provider validation failed" }, 400);
	}
});

adminApp.post("/admin/config", async (c) => {
	const result = await requireAdmin(c);
	if (result instanceof Response) return result;
	const master = c.env.KEY_STORE_MASTER;
	if (!master) return json({ error: "KEY_STORE_MASTER is not configured" }, 500);
	const body = await parseBody(c);
	const scope = body.scope === "voice" ? "voice" : body.scope === "llm" ? "llm" : "";
	const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
	if (!scope || !apiKey) return json({ error: "scope and apiKey are required" }, 400);
	const test = await adminApp.fetch(new Request(new URL("/admin/config/test", c.req.url), { method: "POST", headers: { "content-type": "application/json", cookie: c.req.header("cookie") ?? "" }, body: JSON.stringify(body) }), c.env);
	if (!test.ok) return test;
	const { encKey, iv } = await encryptKey(apiKey, master);
	const now = Date.now();
	const keyHint = `${apiKey.slice(0, 3)}…${apiKey.slice(-4)}`;
	const provider = scope === "llm" ? "deepseek" : "alibaba";
	const label = scope === "llm" ? "Hosted LLM · DeepSeek" : "Hosted Voice · Alibaba Qwen";
	const defaultModel = scope === "llm" && typeof body.model === "string" ? body.model.trim() : null;
	const sttModel = scope === "voice" && typeof body.sttModel === "string" ? body.sttModel.trim() : null;
	const ttsModel = scope === "voice" && typeof body.ttsModel === "string" ? body.ttsModel.trim() : null;
	const baseURL = typeof body.baseURL === "string" ? body.baseURL.trim() || null : null;
	await c.env.tolk_db.prepare(`INSERT INTO platform_credentials_v2 (scope, provider, label, default_model, stt_model, tts_model, base_url, encrypted_api_key, iv, key_hint, enabled, last_validated_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?) ON CONFLICT(scope) DO UPDATE SET provider = excluded.provider, label = excluded.label, default_model = excluded.default_model, stt_model = excluded.stt_model, tts_model = excluded.tts_model, base_url = excluded.base_url, encrypted_api_key = excluded.encrypted_api_key, iv = excluded.iv, key_hint = excluded.key_hint, enabled = 1, last_validated_at = excluded.last_validated_at, updated_at = excluded.updated_at`)
		.bind(scope, provider, label, defaultModel, sttModel, ttsModel, baseURL, encKey, iv, keyHint, now, now, now).run();
	return json({ ok: true, scope, keyHint, validated: true });
});

adminApp.delete("/admin/config/:scope", async (c) => {
	const result = await requireAdmin(c);
	if (result instanceof Response) return result;
	const scope = c.req.param("scope");
	if (scope !== "llm" && scope !== "voice") return json({ error: "invalid scope" }, 400);
	await c.env.tolk_db.prepare(`DELETE FROM platform_credentials_v2 WHERE scope = ?`).bind(scope).run();
	return json({ ok: true, scope });
});
