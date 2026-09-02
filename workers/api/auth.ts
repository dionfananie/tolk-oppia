// auth.ts — Hono app: Google OAuth login/signup + `/me` + multi-provider API key management.
// API key disimpan TER-ENKRIPSI di server (AES-GCM), TIDAK pernah dikembalikan penuh ke frontend
// (hanya `key_hint` di-mask), dan divalidasi ke provider saat disimpan (bukan cek format string).
// Diadaptasi dari quran-hadis/workers/api/odoj.ts (Google OAuth, zero-dep).
import { Hono } from "hono";
import { encryptKey } from "../lib/crypto";
import { testKey } from "../ai/router";
import { getProvider } from "../ai/registry";
import { DEEPGRAM_PROVIDER, testDeepgramKey } from "../ai/deepgram";
import { AIError } from "../ai/types";
import {
	createSession,
	getSessionUser,
	destroySession,
	setSessionCookie,
	clearSessionCookie,
} from "../lib/session";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_SCOPE = "openid email profile";

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});

async function genOAuthState(): Promise<string> {
	const arr = new Uint8Array(24);
	crypto.getRandomValues(arr);
	return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type GoogleTokenResp = { access_token?: string; error?: string };
type GoogleUser = { id?: string; email?: string; name?: string; picture?: string };

export const authApp = new Hono<{ Bindings: Env }>().basePath("/api/auth");

// POST /api/auth/keys/test → validasi key ke provider TANPA menyimpan. { provider, apiKey, model?, baseURL? }
authApp.post("/keys/test", async (c) => {
	const db = c.env.tolk_db;
	const userId = await getSessionUser(db, c.req.raw);
	if (!userId) return json({ error: "unauthorized" }, 401);
	const rawBody = await c.req.json<Record<string, unknown>>().catch(() => ({}));
	const body = rawBody as { provider?: string; apiKey?: string; model?: string; baseURL?: string };
	const provider = (body.provider ?? "").trim();
	const apiKey = (body.apiKey ?? "").trim();
	if (!provider || !apiKey) return json({ error: "provider and apiKey are required" }, 400);

	if (provider === DEEPGRAM_PROVIDER) {
		try {
			const valid = await testDeepgramKey(apiKey);
			return valid
				? json({ valid: true, provider })
				: json({ valid: false, error: "That Deepgram key is not valid." }, 400);
		} catch (err) {
			return json(
				{ valid: false, error: "Deepgram validation failed: " + (err instanceof Error ? err.message : "unknown") },
				400,
			);
		}
	}

	const providerCfg = getProvider(provider);
	if (!providerCfg) return json({ error: `Provider "${provider}" is not supported.` }, 400);
	const model = (body.model ?? "").trim() || providerCfg.models[0]?.id || "";
	const baseURL = (body.baseURL ?? "").trim() || undefined;
	try {
		await testKey(provider as never, apiKey, model, baseURL);
		return json({ valid: true, provider });
	} catch (err) {
		const msg =
			err instanceof AIError ? err.message : "Key validation failed. Check the key and model.";
		return json(
			{ valid: false, error: msg, code: err instanceof AIError ? err.code : "INVALID_API_KEY" },
			400,
		);
	}
});

// Redirect konsen Google
authApp.get("/google", async (c) => {
	const { GOOGLE_CLIENT_ID: id, GOOGLE_REDIRECT_URI: redirect } = c.env;
	if (!id || !redirect) return json({ error: "Google sign-in is not configured" }, 500);
	const url = new URL(c.req.url);
	const returnTo = url.searchParams.get("returnTo") || "/";
	const rand = await genOAuthState();
	const state = `r=${encodeURIComponent(returnTo)}.${rand}`;
	const params = new URLSearchParams({
		client_id: id,
		redirect_uri: redirect,
		response_type: "code",
		scope: GOOGLE_SCOPE,
		access_type: "online",
		state,
	});
	return c.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

// Callback Google → tukar code → upsert user → set session cookie → redirect returnTo
authApp.get("/google/callback", async (c) => {
	try {
		const db = c.env.tolk_db;
		const { GOOGLE_CLIENT_ID: id, GOOGLE_CLIENT_SECRET: secret, GOOGLE_REDIRECT_URI: redirect } =
			c.env;
		const sp = new URL(c.req.url).searchParams;
		const code = sp.get("code");
		const error = sp.get("error");
		if (error) return json({ error: `Google sign-in was cancelled: ${error}` }, 400);
		if (!code) return json({ error: "Missing authorization code" }, 400);
		if (!id || !secret) return json({ error: "Google sign-in is not configured" }, 500);

		const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				code,
				client_id: id,
				client_secret: secret,
				redirect_uri: redirect || "",
				grant_type: "authorization_code",
			}),
		});
		let tokenJson: GoogleTokenResp;
		try {
			tokenJson = (await tokenResp.json()) as GoogleTokenResp;
		} catch {
			return json({ error: `Could not parse the Google token response (HTTP ${tokenResp.status})` }, 500);
		}
		if (!tokenJson.access_token || tokenJson.error) {
			return json({ error: `Could not get a Google token: ${tokenJson.error || tokenResp.status}` }, 400);
		}

		const userResp = await fetch(GOOGLE_USERINFO_URL, {
			headers: { authorization: `Bearer ${tokenJson.access_token}` },
		});
		if (!userResp.ok) return json({ error: `Could not fetch the Google profile (HTTP ${userResp.status})` }, 400);
		const g = (await userResp.json()) as GoogleUser;
		if (!g.email) return json({ error: "Google did not return an email" }, 400);

		const googleSub = g.id || `sub:${g.email}`;
		const email = g.email.toLowerCase().trim();
		const name = g.name || email.split("@")[0];
		const avatar = g.picture || "";

		// Upsert: cari by google_sub lalu by email
		let user = await db
			.prepare(`SELECT user_id FROM users WHERE google_sub = ?`)
			.bind(googleSub)
			.first<{ user_id: string }>();
		if (!user) {
			user = await db
				.prepare(`SELECT user_id FROM users WHERE email = ?`)
				.bind(email)
				.first<{ user_id: string }>();
		}

		let uid: string;
		if (user) {
			uid = user.user_id;
			await db
				.prepare(
					`UPDATE users SET google_sub = ?, name = ?, avatar_url = ? WHERE user_id = ?`,
				)
				.bind(googleSub, name, avatar, uid)
				.run();
		} else {
			uid = googleSub;
			await db
				.prepare(
					`INSERT INTO users (user_id, email, created_at, name, avatar_url, google_sub)
					 VALUES (?, ?, ?, ?, ?, ?)`,
				)
				.bind(uid, email, Date.now(), name, avatar, googleSub)
				.run();
		}

		const { token, expiresMs } = await createSession(db, uid);

		// returnTo dari OAuth state ("r=<enc>.<rand>")
		let returnTo = "/";
		const oauthState = sp.get("state") || "";
		if (oauthState.startsWith("r=")) {
			const encoded = oauthState.slice(2).split(".")[0];
			try {
				const decoded = decodeURIComponent(encoded);
				if (decoded.startsWith("/")) returnTo = decoded;
			} catch {
				/* ignore */
			}
		}
		const redirectUrl = new URL(returnTo, c.req.url).toString();
		const res = new Response(null, { status: 302, headers: { location: redirectUrl } });
		setSessionCookie(res.headers, token, expiresMs);
		return res;
	} catch (err) {
		return json({ error: `callback error: ${err instanceof Error ? err.message : String(err)}` }, 500);
	}
});

// `me` — sesi saat ini
authApp.get("/me", async (c) => {
	const db = c.env.tolk_db;
	const userId = await getSessionUser(db, c.req.raw);
	if (!userId) return json({ user: null }, 200);
	const user = await db
		.prepare(`SELECT user_id, email, name, avatar_url FROM users WHERE user_id = ?`)
		.bind(userId)
		.first();
	return json({ user: user || null });
});

// Logout
authApp.post("/logout", async (c) => {
	await destroySession(c.env.tolk_db, c.req.raw);
	const res = json({ ok: true });
	clearSessionCookie(res.headers);
	return res;
});

// ── MULTI-PROVIDER API KEYS (BYOK server-side) ──────────────────────────────────────────
// Semua endpoint butuh login. Key divalidasi ke provider saat simpan, dienkripsi AES-GCM,
// dan frontend hanya menerima `key_hint` (di-mask) — key penuh TIDAK pernah keluar server.

/** Buat hint key untuk tampilan (masking). Contoh: `sk-…8F2A`. */
function makeKeyHint(raw: string): string {
	const key = raw.trim();
	if (!key) return "";
	const tail = key.slice(-4);
	const prefix = key.slice(0, 3);
	return `${prefix}…${tail}`;
}

type CredKeyRow = {
	provider: string;
	label: string;
	default_model: string | null;
	base_url: string | null;
	encrypted_api_key: string;
	iv: string;
	key_hint: string;
	is_default: number;
	last_validated_at: number | null;
};

// GET /api/auth/keys → list provider+model+baseURL+key_hint user (TANPA key penuh).
authApp.get("/keys", async (c) => {
	const db = c.env.tolk_db;
	const userId = await getSessionUser(db, c.req.raw);
	if (!userId) return json({ error: "unauthorized" }, 401);

	const rows = await db
		.prepare(
			`SELECT provider, label, default_model, base_url, key_hint, is_default, last_validated_at
			 FROM user_ai_credentials WHERE user_id = ? ORDER BY provider`,
		)
		.bind(userId)
		.all<CredKeyRow>();
	const keys = (rows.results ?? []).map((r) => ({
		provider: r.provider,
		label: r.label,
		model: r.default_model ?? "",
		baseURL: r.base_url ?? undefined,
		keyHint: r.key_hint,
		isDefault: Boolean(r.is_default),
		lastValidatedAt: r.last_validated_at ?? undefined,
	}));
	return json({ keys });
});

// POST /api/auth/keys → validasi key ke provider, simpan terenkripsi.
// { provider, apiKey, model?, label?, baseURL? } — model default dari registry bila kosong.
authApp.post("/keys", async (c) => {
	const db = c.env.tolk_db;
	const master = c.env.KEY_STORE_MASTER;
	const userId = await getSessionUser(db, c.req.raw);
	if (!userId) return json({ error: "unauthorized" }, 401);

	const rawBody = await c.req.json<Record<string, unknown>>().catch(() => ({}));
	const body = rawBody as {
		provider?: string;
		apiKey?: string;
		model?: string;
		label?: string;
		baseURL?: string;
	};
	const provider = (body.provider ?? "").trim();
	const apiKey = (body.apiKey ?? "").trim();
	if (!provider || !apiKey) return json({ error: "provider and apiKey are required" }, 400);
	if (!master) return json({ error: "KEY_STORE_MASTER is not configured" }, 500);

	const isDeepgram = provider === DEEPGRAM_PROVIDER;

	// Deepgram: tanpa chat model; validasi lewat akses /projects.
	let model: string;
	let baseURL: string | undefined;
	if (isDeepgram) {
		try {
			const valid = await testDeepgramKey(apiKey);
			if (!valid) {
				return json({ error: "That Deepgram key is not valid.", code: "INVALID_API_KEY" }, 400);
			}
		} catch (err) {
			return json(
				{
					error: "Deepgram validation failed: " + (err instanceof Error ? err.message : "unknown"),
					code: "INVALID_API_KEY",
				},
				400,
			);
		}
		model = (body.model ?? "").trim() || "";
		baseURL = undefined;
	} else {
		const providerCfg = getProvider(provider);
		if (!providerCfg) return json({ error: `Provider "${provider}" is not supported.` }, 400);
		model = (body.model ?? "").trim() || providerCfg.models[0]?.id || "";
		baseURL = (body.baseURL ?? "").trim() || undefined;

		// Validasi key ke provider (1 pesan chat) — jangan andalkan format string.
		try {
			await testKey(provider as never, apiKey, model, baseURL);
		} catch (err) {
			const msg =
				err instanceof AIError ? err.message : "Key validation failed. Check the key and model.";
			return json({ error: msg, code: err instanceof AIError ? err.code : "INVALID_API_KEY" }, 400);
		}
	}

	const label = (body.label ?? "Personal").trim() || "Personal";

	const { encKey, iv } = await encryptKey(apiKey, master);
	const now = Date.now();
	const existing = await db
		.prepare(`SELECT id FROM user_ai_credentials WHERE user_id = ? AND provider = ?`)
		.bind(userId, provider)
		.first<{ id: number }>();

	if (existing) {
		await db
			.prepare(
				`UPDATE user_ai_credentials
				 SET label = ?, default_model = ?, base_url = ?, encrypted_api_key = ?, iv = ?,
				     key_hint = ?, last_validated_at = ?, updated_at = ?
				 WHERE user_id = ? AND provider = ?`,
			)
			.bind(label, model, baseURL ?? null, encKey, iv, makeKeyHint(apiKey), now, now, userId, provider)
			.run();
	} else {
		await db
			.prepare(
				`INSERT INTO user_ai_credentials
				 (user_id, provider, label, default_model, base_url, encrypted_api_key, iv,
				  key_hint, is_default, last_validated_at, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				userId, provider, label, model, baseURL ?? null, encKey, iv,
				makeKeyHint(apiKey), 0, now, now, now,
			)
			.run();
	}

	return json({ ok: true, keyHint: makeKeyHint(apiKey), validated: true });
});

// DELETE /api/auth/keys/:provider → hapus key provider tsb (permanen, sesuai permintaan user).
authApp.delete("/keys/:provider", async (c) => {
	const db = c.env.tolk_db;
	const userId = await getSessionUser(db, c.req.raw);
	if (!userId) return json({ error: "unauthorized" }, 401);
	const provider = c.req.param("provider");
	await db
		.prepare(`DELETE FROM user_ai_credentials WHERE user_id = ? AND provider = ?`)
		.bind(userId, provider)
		.run();
	return json({ ok: true });
});

// PATCH /api/auth/keys/:provider/default → jadikan key ini default (selected saat chat).
authApp.patch("/keys/:provider/default", async (c) => {
	const db = c.env.tolk_db;
	const userId = await getSessionUser(db, c.req.raw);
	if (!userId) return json({ error: "unauthorized" }, 401);
	const provider = c.req.param("provider");
	await db
		.prepare(`UPDATE user_ai_credentials SET is_default = 0 WHERE user_id = ?`)
		.bind(userId)
		.run();
	await db
		.prepare(`UPDATE user_ai_credentials SET is_default = 1 WHERE user_id = ? AND provider = ?`)
		.bind(userId, provider)
		.run();
	return json({ ok: true });
});
