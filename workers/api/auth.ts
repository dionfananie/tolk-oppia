// auth.ts — Hono app: Google OAuth login/signup + `/me` + `/setup` (simpan/key API terenkripsi).
// Diadaptasi dari quran-hadis/workers/api/odoj.ts (Google OAuth, zero-dep).
import { Hono } from "hono";
import { encryptKey, decryptKey } from "../lib/crypto";
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

// Redirect konsen Google
authApp.get("/google", async (c) => {
	const { GOOGLE_CLIENT_ID: id, GOOGLE_REDIRECT_URI: redirect } = c.env;
	if (!id || !redirect) return json({ error: "Google login belum dikonfigurasi" }, 500);
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
		if (error) return json({ error: `Google auth dibatalkan: ${error}` }, 400);
		if (!code) return json({ error: "Kode otorisasi tidak ada" }, 400);
		if (!id || !secret) return json({ error: "Google login belum dikonfigurasi" }, 500);

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
			return json({ error: `Gagal parse respon token Google (HTTP ${tokenResp.status})` }, 500);
		}
		if (!tokenJson.access_token || tokenJson.error) {
			return json({ error: `Gagal mendapat token Google: ${tokenJson.error || tokenResp.status}` }, 400);
		}

		const userResp = await fetch(GOOGLE_USERINFO_URL, {
			headers: { authorization: `Bearer ${tokenJson.access_token}` },
		});
		if (!userResp.ok) return json({ error: `Gagal mengambil profil Google (HTTP ${userResp.status})` }, 400);
		const g = (await userResp.json()) as GoogleUser;
		if (!g.email) return json({ error: "Google tidak mengembalikan email" }, 400);

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

// ── SETUP (API key terenkripsi — server-side, dipakai relay /api/chat) ──
// GET /api/auth/setup → { setup: {provider, model, hasKey} } — TANPA kirim key plaintext.
authApp.get("/setup", async (c) => {
	const db = c.env.tolk_db;
	const userId = await getSessionUser(db, c.req.raw);
	if (!userId) return json({ error: "unauthorized" }, 401);
	const row = await db
		.prepare(`SELECT provider, model FROM api_keys WHERE user_id = ?`)
		.bind(userId)
		.first<{ provider: string; model: string }>();
	if (!row) return json({ setup: null });
	return json({ setup: { provider: row.provider, model: row.model, hasKey: true } });
});

// POST /api/auth/setup → simpan { provider, model, apiKey } terenkripsi.
// apiKey kosong → hanya update provider/model (pertahankan key lama).
authApp.post("/setup", async (c) => {
	const db = c.env.tolk_db;
	const master = c.env.KEY_STORE_MASTER;
	const userId = await getSessionUser(db, c.req.raw);
	if (!userId) return json({ error: "unauthorized" }, 401);
	const rawBody = await c.req.json<Record<string, unknown>>().catch(() => ({}));
	const body = rawBody as { provider?: string; model?: string; apiKey?: string };
	const provider = typeof body.provider === "string" ? body.provider.trim() : "";
	const model = typeof body.model === "string" ? body.model.trim() : "";
	if (!provider || !model) return json({ error: "provider & model wajib" }, 400);
	if (!master) return json({ error: "KEY_STORE_MASTER belum dikonfigurasi" }, 500);

	const existing = await db
		.prepare(`SELECT enc_key, iv FROM api_keys WHERE user_id = ?`)
		.bind(userId)
		.first<{ enc_key: string; iv: string }>();

	const newKey = typeof body.apiKey === "string" && body.apiKey.trim() ? body.apiKey.trim() : null;

	if (newKey) {
		const { encKey, iv } = await encryptKey(newKey, master);
		await db
			.prepare(
				`INSERT INTO api_keys (user_id, provider, model, enc_key, iv, created_at)
				 VALUES (?, ?, ?, ?, ?, ?)
				 ON CONFLICT(user_id) DO UPDATE SET provider = excluded.provider, model = excluded.model, enc_key = excluded.enc_key, iv = excluded.iv`,
			)
			.bind(userId, provider, model, encKey, iv, Date.now())
			.run();
	} else {
		// update provider/model tanpa ganti key (pertahankan cipher lama kalau ada)
		if (model) {
			await db
				.prepare(`UPDATE api_keys SET provider = ?, model = ? WHERE user_id = ?`)
				.bind(provider, model, userId)
				.run();
		}
	}
	return json({ ok: true, hasKey: true });
});

// POST /api/auth/setup/clear → hapus key tersimpan (sign out dari provider)
authApp.post("/setup/clear", async (c) => {
	const db = c.env.tolk_db;
	const userId = await getSessionUser(db, c.req.raw);
	if (!userId) return json({ error: "unauthorized" }, 401);
	await db.prepare(`DELETE FROM api_keys WHERE user_id = ?`).bind(userId).run();
	return json({ ok: true });
});
