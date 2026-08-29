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

/** Simpan/update setup key ke server (login). Return boolean sukses. */
export async function saveServerSetup(value: {
	provider: string;
	model: string;
	apiKey?: string;
}): Promise<boolean> {
	try {
		const res = await fetch("/api/auth/setup", {
			method: "POST",
			headers: { "content-type": "application/json" },
			credentials: "same-origin",
			body: JSON.stringify(value),
		});
		return res.ok;
	} catch {
		return false;
	}
}

/** Baca setup server (provider/model + ada key atau tidak). */
export async function fetchServerSetup(): Promise<{
	provider: string;
	model: string;
	hasKey: boolean;
} | null> {
	try {
		const res = await fetch("/api/auth/setup", { credentials: "same-origin" });
		if (!res.ok) return null;
		const data = (await res.json()) as {
			setup?: { provider: string; model: string; hasKey: boolean } | null;
		};
		return data.setup ?? null;
	} catch {
		return null;
	}
}

/** Hapus key tersimpan server (sign out dari provider). */
export async function clearServerSetup(): Promise<void> {
	try {
		await fetch("/api/auth/setup/clear", { method: "POST", credentials: "same-origin" });
	} catch {
		/* ignore */
	}
}
