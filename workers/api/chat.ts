// chat.ts — Relay /api/chat (server-proxy): server decrypt key milik user, call provider
// lewat Provider Router (multi-provider), normalisasi respon & error. Key TIDAK pernah
// ke browser. Dilkukan setelah login; provider/model dipilih di frontend dr list connected.

import { Hono } from "hono";
import { getSessionUser } from "../lib/session";
import { generate } from "../ai/router";
import { AIError } from "../ai/types";
import { getOrCreateEntitlement } from "../lib/entitlements";
import { resolvePlatformLLM } from "../lib/credentials-platform";
import { resolveUserCredential } from "../lib/credentials-user";

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

// ── Rate limit sederhana (in-memory per isolate): batas per user_id + provider per menit.
// Catatan: best-effort (reset saat isolate baru). Cukup utk cegah abuse satu user.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60; // 60 request/menit per user (keseluruhan, semua provider juga dihitung per provider di bawah).
type RateBucket = { count: number; resetAt: number };
const rate = new Map<string, RateBucket>();

function rateLimited(scope: string): boolean {
	const now = Date.now();
	const bucket = rate.get(scope);
	if (!bucket || now >= bucket.resetAt) {
		rate.set(scope, { count: 1, resetAt: now + RATE_WINDOW_MS });
		return false;
	}
	bucket.count += 1;
	return bucket.count > RATE_MAX;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Mount ke apiApp (basePath "/api") di workers/app.ts — jangan basePath sendiri di sini.
export const chatApp = new Hono<{ Bindings: Env }>();

// (mounted sbg /api/chat via apiApp)
chatApp.post("/chat", async (c) => {
	const db = c.env.tolk_db;
	const master = c.env.KEY_STORE_MASTER;
	const userId = await getSessionUser(db, c.req.raw);
	if (!userId) return json({ error: "unauthorized, sign in required" }, 401);

	if (rateLimited(`chat:${userId}`)) return json({ error: "RATE_LIMITED: too many requests, try again shortly." }, 429);
	if (!master) return json({ error: "KEY_STORE_MASTER is not configured" }, 500);

	const rawBody = await c.req.json<Record<string, unknown>>().catch(() => ({}));
	const raw = rawBody as {
		provider?: string;
		model?: string;
		messages?: ChatMsg[];
		temperature?: number;
		maxTokens?: number;
		json?: boolean;
	};
	const provider = (raw.provider ?? "").trim();
	const model = (raw.model ?? "").trim();
	const { messages, temperature, maxTokens, json: wantJson } = raw;
	if (!provider || !model || !Array.isArray(messages) || messages.length === 0) {
		return json({ error: "provider, model, and messages are required" }, 400);
	}

	const entitlement = await getOrCreateEntitlement(db, userId);
	const credential = entitlement.planId === "byok"
		? await resolveUserCredential(db, master, userId, provider, model)
		: await resolvePlatformLLM(db, master);
	if (!credential) {
		return json({ error: "provider_not_available", message: "This plan does not have a configured provider credential." }, 403);
	}
	if (rateLimited(`chat:${userId}:${provider}`)) return json({ error: "RATE_LIMITED: too many requests to this provider." }, 429);

	try {
		const result = await generate(provider as never, {
			apiKey: credential.apiKey,
			model: credential.model,
			messages,
			temperature,
			maxTokens,
			json: wantJson,
			baseURL: credential.baseURL,
		});
		return json({ content: result.content, usage: result.usage, source: credential.owner });
	} catch (err) {
		if (err instanceof AIError) {
			return json({ error: err.message, code: err.code, retryable: err.retryable }, httpFor(err.code));
		}
		return json({ error: `Provider call failed: ${err instanceof Error ? err.message : "unknown"}` }, 502);
	}
});

// sleep dipakai utk backoff kecil di retry — sementara dipakai utk rate-limit friendly.
export { sleep };

function httpFor(code: "INVALID_API_KEY" | "RATE_LIMITED" | "INSUFFICIENT_CREDITS" | "MODEL_NOT_FOUND" | "PROVIDER_ERROR" | "TIMEOUT" | "UNSUPPORTED_PROVIDER"): number {
	switch (code) {
		case "INVALID_API_KEY":
			return 401;
		case "RATE_LIMITED":
			return 429;
		case "MODEL_NOT_FOUND":
			return 404;
		case "TIMEOUT":
			return 504;
		case "INSUFFICIENT_CREDITS":
			return 402;
		default:
			return 502;
	}
}
