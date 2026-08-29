// env.d.ts — Deklarasi global Env utk worker Tolk (binding D1 + secrets runtime).
// Secrets (wrangler secret put) TIDAK muncul di worker-configuration.d.ts —
// dideklarasikan di sini agar typechecker tahu.
declare global {
	interface Env {
		// D1 binding (wrangler.json)
		tolk_db: D1Database;
		// OAuth Google (wrangler secret put)
		GOOGLE_CLIENT_ID?: string;
		GOOGLE_CLIENT_SECRET?: string;
		GOOGLE_REDIRECT_URI?: string;
		// Master key utk AES-GCM encrypt API key (wrangler secret put)
		KEY_STORE_MASTER?: string;
	}
}

export {};
