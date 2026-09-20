import { Hono } from "hono";
import { encryptKey } from "../lib/crypto";
import { getSessionUser } from "../lib/session";
import { getProvider, testKey } from "../ai/router";
import { DEEPGRAM_PROVIDER, testDeepgramKey } from "../ai/deepgram";

declare global {
	interface Env {
		TOLK_ADMIN_EMAIL?: string;
	}
}

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});

export const adminApp = new Hono<{ Bindings: Env }>();

async function requireAdmin(c: { env: Env; req: { raw: Request } }): Promise<string | Response> {
	const userId = await getSessionUser(c.env.tolk_db, c.req.raw);
	if (!userId) return json({ error: "unauthorized" }, 401);
	const adminEmail = c.env.TOLK_ADMIN_EMAIL?.trim().toLowerCase();
	if (!adminEmail) return json({ error: "admin access is not configured" }, 503);
	const user = await c.env.tolk_db
		.prepare(`SELECT email FROM users WHERE user_id = ?`)
		.bind(userId)
		.first<{ email: string | null }>();
	if (!user?.email || user.email.toLowerCase() !== adminEmail) return json({ error: "forbidden" }, 403);
	return userId;
}

adminApp.get("/admin/providers", async (c) => {
	const result = await requireAdmin(c);
	if (result instanceof Response) return result;
	const rows = await c.env.tolk_db
		.prepare(
			`SELECT provider, label, default_model, base_url, key_hint, enabled, last_validated_at
			 FROM platform_credentials ORDER BY provider`,
		)
		.all();
	return json({ providers: rows.results ?? [] });
});

adminApp.post("/admin/providers/test", async (c) => {
	const result = await requireAdmin(c);
	if (result instanceof Response) return result;
	const body = (await c.req.json<Record<string, unknown>>().catch(() => ({}))) as Record<string, unknown>;
	const provider = typeof body.provider === "string" ? body.provider.trim() : "";
	const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
	const model = typeof body.model === "string" ? body.model.trim() : "";
	const baseURL = typeof body.baseURL === "string" ? body.baseURL.trim() || undefined : undefined;
	if (!provider || !apiKey) return json({ error: "provider and apiKey are required" }, 400);

	try {
		if (provider === DEEPGRAM_PROVIDER) {
			if (!(await testDeepgramKey(apiKey))) return json({ valid: false, error: "Deepgram key is invalid" }, 400);
		} else {
			const cfg = getProvider(provider);
			if (!cfg) return json({ valid: false, error: "Unsupported provider" }, 400);
			await testKey(provider as never, apiKey, model || cfg.models[0]?.id || "", baseURL);
		}
		return json({ valid: true });
	} catch (error) {
		return json({ valid: false, error: error instanceof Error ? error.message : "Provider validation failed" }, 400);
	}
});

adminApp.post("/admin/providers", async (c) => {
	const result = await requireAdmin(c);
	if (result instanceof Response) return result;
	const master = c.env.KEY_STORE_MASTER;
	if (!master) return json({ error: "KEY_STORE_MASTER is not configured" }, 500);
	const body = (await c.req.json<Record<string, unknown>>().catch(() => ({}))) as Record<string, unknown>;
	const provider = typeof body.provider === "string" ? body.provider.trim() : "";
	const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
	const model = typeof body.model === "string" ? body.model.trim() : "";
	const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : "TOLK hosted provider";
	const baseURL = typeof body.baseURL === "string" ? body.baseURL.trim() || null : null;
	if (!provider || !apiKey) return json({ error: "provider and apiKey are required" }, 400);

	const test = await adminApp.fetch(new Request(new URL("/admin/providers/test", c.req.url), {
		method: "POST",
		headers: { "content-type": "application/json", cookie: c.req.header("cookie") ?? "" },
		body: JSON.stringify({ provider, apiKey, model, baseURL }),
	}), c.env);
	if (!test.ok) return test;

	const { encKey, iv } = await encryptKey(apiKey, master);
	const now = Date.now();
	const keyHint = `${apiKey.slice(0, 3)}…${apiKey.slice(-4)}`;
	await c.env.tolk_db
		.prepare(
			`INSERT INTO platform_credentials
			 (provider, label, default_model, base_url, encrypted_api_key, iv, key_hint, enabled, last_validated_at, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
			 ON CONFLICT(provider) DO UPDATE SET
			 label = excluded.label, default_model = excluded.default_model, base_url = excluded.base_url,
			 encrypted_api_key = excluded.encrypted_api_key, iv = excluded.iv, key_hint = excluded.key_hint,
			 enabled = 1, last_validated_at = excluded.last_validated_at, updated_at = excluded.updated_at`,
		)
		.bind(provider, label, model || null, baseURL, encKey, iv, keyHint, now, now, now)
		.run();
	return json({ ok: true, provider, keyHint, validated: true });
});

adminApp.delete("/admin/providers/:provider", async (c) => {
	const result = await requireAdmin(c);
	if (result instanceof Response) return result;
	await c.env.tolk_db.prepare(`DELETE FROM platform_credentials WHERE provider = ?`).bind(c.req.param("provider")).run();
	return json({ ok: true });
});
