// auth.ts — Client helper utk sesi Google (server-side cookie). Zero-dep.
import { useEffect, useState } from "react";

export type AuthUser = {
	user_id: string;
	email: string | null;
	name: string | null;
	avatar_url: string | null;
};

const REFETCH_EVENT = "tolk:auth";

/** Panggil /api/auth/me → user atau null. */
export async function fetchMe(): Promise<AuthUser | null> {
	try {
		const res = await fetch("/api/auth/me", { credentials: "same-origin" });
		if (!res.ok) return null;
		const data = (await res.json()) as { user?: AuthUser | null };
		return data.user ?? null;
	} catch {
		return null;
	}
}

/** Hook sesi — refresh pada mount + event auth change. */
export function useAuth(): {
	user: AuthUser | null;
	loading: boolean;
	refresh: () => void;
} {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);

	const refresh = async () => {
		const u = await fetchMe();
		setUser(u);
		setLoading(false);
	};

	useEffect(() => {
		void refresh();
		const onAuth = () => void refresh();
		window.addEventListener(REFETCH_EVENT, onAuth);
		return () => window.removeEventListener(REFETCH_EVENT, onAuth);
	}, []);

	return { user, loading, refresh };
}

/** Beri tahu seluruh app bahwa sesi berubah (login/logout) — pemicu refresh useAuth. */
export function notifyAuthChange(): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new Event(REFETCH_EVENT));
}

/** Redirect ke Google consent, kembali ke path tertentu. */
export function googleLoginUrl(returnTo?: string): string {
	const rt = returnTo
		? `?returnTo=${encodeURIComponent(returnTo)}`
		: "";
	return `/api/auth/google${rt}`;
}

/** Logout server-side lalu refresh state. */
export async function logout(): Promise<void> {
	try {
		await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
	} finally {
		notifyAuthChange();
	}
}

export type StoredKey = {
	provider: string;
	label: string;
	model: string;
	baseURL?: string;
	keyHint: string;
	isDefault: boolean;
	lastValidatedAt?: number;
};

/** Validasi key ke provider (tanpa simpan). Mengembalikan { valid, error? }. */
export async function testServerKey(value: {
	provider: string;
	apiKey: string;
	model?: string;
	baseURL?: string;
}): Promise<{ valid: boolean; error?: string }> {
	try {
		const res = await fetch("/api/auth/keys/test", {
			method: "POST",
			headers: { "content-type": "application/json" },
			credentials: "same-origin",
			body: JSON.stringify(value),
		});
		const data = (await res.json().catch(() => ({}))) as { valid?: boolean; error?: string };
		return { valid: Boolean(data.valid), error: data.error };
	} catch {
		return { valid: false, error: "Gagal terhubung server." };
	}
}

/** Simpan/tambah key utk provider ke server (login). Server memvalidasi key ke provider dulu.
 *  Mengembalikan { ok, error? } — key TIDAK pernah dikembalikan penuh ke client. */
export async function saveServerKey(value: {
	provider: string;
	apiKey: string;
	model?: string;
	label?: string;
	baseURL?: string;
}): Promise<{ ok: boolean; error?: string; code?: string }> {
	try {
		const res = await fetch("/api/auth/keys", {
			method: "POST",
			headers: { "content-type": "application/json" },
			credentials: "same-origin",
			body: JSON.stringify(value),
		});
		const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
		if (!res.ok) return { ok: false, error: data.error, code: data.code };
		return { ok: true };
	} catch {
		return { ok: false, error: "Gagal terhubung server. Coba lagi." };
	}
}

/** Ambil semua key+provider yg tersimpan di akun user (TANPA key penuh, hanya hint di-mask). */
export async function fetchServerKeys(): Promise<StoredKey[] | null> {
	try {
		const res = await fetch("/api/auth/keys", { credentials: "same-origin" });
		if (!res.ok) return null;
		const data = (await res.json()) as { keys?: StoredKey[] };
		return data.keys ?? [];
	} catch {
		return null;
	}
}

/** Hapus key utk provider tertentu dari akun. */
export async function deleteServerKey(provider: string): Promise<boolean> {
	try {
		const res = await fetch(`/api/auth/keys/${encodeURIComponent(provider)}`, {
			method: "DELETE",
			credentials: "same-origin",
		});
		return res.ok;
	} catch {
		return false;
	}
}

/** Jadikan key provider tsb default di akun. */
export async function setDefaultServerKey(provider: string): Promise<boolean> {
	try {
		const res = await fetch(`/api/auth/keys/${encodeURIComponent(provider)}/default`, {
			method: "PATCH",
			credentials: "same-origin",
		});
		return res.ok;
	} catch {
		return false;
	}
}
