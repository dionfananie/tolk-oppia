// chat.ts — Relay /api/chat: server decrypt key tersimpan (api_keys) lalu call OpenRouter.
// Key TIDAK pernah keluar ke browser. Dipanggil client setelah login (setup tersimpan server-side).
import { Hono } from "hono";
import { decryptKey } from "../lib/crypto";
import { getSessionUser } from "../lib/session";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export const chatApp = new Hono<{ Bindings: Env }>().basePath("/api");

// POST /api/chat { model, messages, temperature?, maxTokens?, json? }
// Ambil apiKey dari api_keys milik user login (server-side, terenkripsi).
// Fallback jika user belum simpan key: error blok — client harus simpan lewat /api/auth/setup
// ATAU pakai BYOK lokal (client fetch langsung, di luar relay ini).
chatApp.post("/chat", async (c) => {
	const db = c.env.tolk_db;
	const master = c.env.KEY_STORE_MASTER;
	const userId = await getSessionUser(db, c.req.raw);
	if (!userId) return json({ error: "unauthorized — login required" }, 401);

	const rawJson = await c.req.json<Record<string, unknown>>().catch(() => ({}));
	const raw = rawJson as {
		model?: string;
		messages?: ChatMsg[];
		temperature?: number;
		maxTokens?: number;
		json?: boolean;
	};
	const { model, messages, temperature, maxTokens, json: wantJson } = raw;
	if (!model || !Array.isArray(messages)) return json({ error: "model & messages wajib" }, 400);

	const keyRow = await db
		.prepare(`SELECT enc_key, iv FROM api_keys WHERE user_id = ?`)
		.bind(userId)
		.first<{ enc_key: string; iv: string }>();
	if (!keyRow) return json({ error: "no_api_key" }, 404);
	if (!master) return json({ error: "KEY_STORE_MASTER belum dikonfigurasi" }, 500);

	const apiKey = await decryptKey(keyRow.enc_key, keyRow.iv, master);

	const body: Record<string, unknown> = {
		model,
		messages,
		temperature: temperature ?? 0.7,
		max_tokens: maxTokens ?? 1024,
	};
	if (wantJson) body.response_format = { type: "json_object" };

	let res: Response;
	try {
		res = await fetch(OPENROUTER_URL, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${apiKey}`,
				"HTTP-Referer": "https://tolk.oppia.world",
				"X-Title": "TOLK",
			},
			body: JSON.stringify(body),
		});
	} catch (err) {
		return json({ error: `Gagal menghubungi OpenRouter: ${err instanceof Error ? err.message : "network error"}` }, 502);
	}

	const text = await res.text();
	if (!res.ok) {
		let detail = `HTTP ${res.status}`;
		try {
			const d = JSON.parse(text) as { error?: { message?: string } };
			if (d?.error?.message) detail = d.error.message;
		} catch {
			/* ignore */
		}
		return json({ error: `OpenRouter request failed: ${detail}` }, res.status);
	}

	let data: { choices?: { message?: { content?: string } }[] };
	try {
		data = JSON.parse(text);
	} catch {
		return json({ error: "Respon OpenRouter tidak valid" }, 502);
	}
	const content = data?.choices?.[0]?.message?.content;
	if (typeof content !== "string" || !content.trim()) {
		return json({ error: "OpenRouter returned an empty response." }, 502);
	}
	return json({ content: content.trim() });
});
