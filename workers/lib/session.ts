// session.ts — Session cookie (HttpOnly, Secure, SameSite=Lax) + validasi via D1.
// Sesi disimpan di tabel `sessions`. Token acak 32-byte hex.
// Diadaptasi dari quran-hadis/workers/lib/session.ts (cookie diubah utk Tolk).

const enc = new TextEncoder();

function randomToken(): string {
	const arr = new Uint8Array(32);
	crypto.getRandomValues(arr);
	return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const COOKIE = "tolk_session";

function getCookieValue(header: string, name: string): string | null {
	for (const part of header.split(";")) {
		const idx = part.indexOf("=");
		if (idx === -1) continue;
		const k = part.slice(0, idx).trim();
		if (k === name) return part.slice(idx + 1).trim() || null;
	}
	return null;
}

export function getSessionToken(request: Request): string | null {
	const header = request.headers.get("Cookie");
	if (!header) return null;
	return getCookieValue(header, COOKIE);
}

/** Set cookie sesi pada Response headers. `expires` di ms sejak epoch. */
export function setSessionCookie(
	headers: Headers,
	token: string,
	expiresMs: number,
): void {
	const date = new Date(expiresMs).toUTCString();
	headers.append(
		"Set-Cookie",
		`${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${date}`,
	);
}

/** Hapus cookie sesi. */
export function clearSessionCookie(headers: Headers): void {
	headers.append(
		"Set-Cookie",
		`${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
	);
}

export interface Session {
	token: string;
	user_id: string;
	expires_at: number;
}

/** Buat sesi baru utk user. Return `{ token, expiresMs }`. */
export async function createSession(
	db: D1Database,
	userId: string,
	ttlMs = 1000 * 60 * 60 * 24 * 30, // 30 hari
): Promise<{ token: string; expiresMs: number }> {
	const token = randomToken();
	const expiresMs = Date.now() + ttlMs;
	const expiresUnix = Math.floor(expiresMs / 1000);
	await db
		.prepare(
			`INSERT INTO sessions (token, user_id, expires_at)
			 VALUES (?, ?, ?)`,
		)
		.bind(token, userId, expiresUnix)
		.run();
	return { token, expiresMs };
}

/** Baca sesi dari request (validasi token + expiry). Return user_id atau null. */
export async function getSessionUser(
	db: D1Database,
	request: Request,
): Promise<string | null> {
	const token = getSessionToken(request);
	if (!token) return null;
	const row = await db
		.prepare(`SELECT user_id, expires_at FROM sessions WHERE token = ?`)
		.bind(token)
		.first<{ user_id: string; expires_at: number }>();
	if (!row) return null;
	// expires_at disimpan unix seconds — bandingkan dengan now seconds.
	if (row.expires_at * 1000 < Date.now()) {
		await db.prepare(`DELETE FROM sessions WHERE token = ?`).bind(token).run();
		return null;
	}
	return row.user_id;
}

/** Hapus sesi (logout). */
export async function destroySession(db: D1Database, request: Request): Promise<void> {
	const token = getSessionToken(request);
	if (token) {
		await db.prepare(`DELETE FROM sessions WHERE token = ?`).bind(token).run();
	}
}
