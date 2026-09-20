import { useEffect, useState } from "react";
import type { Route } from "./+types/admin";
import { AppShell } from "~/components/AppShell";
import { Button } from "~/components/Button";
import { useAuth } from "~/lib/auth";

export function meta({}: Route.MetaArgs) {
	return [{ title: "Admin · TOLK" }];
}

type PlatformProvider = {
	provider: string;
	label: string;
	default_model: string | null;
	base_url: string | null;
	key_hint: string;
	enabled: number;
	last_validated_at: number | null;
};

const PROVIDERS = [
	{ id: "deepseek", label: "DeepSeek", model: "deepseek-v4-flash", baseURL: "" },
	{ id: "deepgram", label: "Deepgram", model: "", baseURL: "" },
	{
		id: "alibaba",
		label: "Alibaba Cloud Qwen TTS",
		model: "qwen3-tts-flash",
		baseURL: "https://dashscope-intl.aliyuncs.com/api/v1",
	},
] as const;

export default function Admin() {
	const { user, loading } = useAuth();
	const [providers, setProviders] = useState<PlatformProvider[]>([]);
	const [selected, setSelected] = useState<string>(PROVIDERS[0].id);
	const [apiKey, setApiKey] = useState<string>("");
	const [model, setModel] = useState<string>(PROVIDERS[0].model);
	const [baseURL, setBaseURL] = useState<string>(PROVIDERS[0].baseURL);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		const config = PROVIDERS.find((item) => item.id === selected) ?? PROVIDERS[0];
		setModel(config.model);
		setBaseURL(config.baseURL);
		setApiKey("");
	}, [selected]);

	useEffect(() => {
		if (!user) return;
		void fetch("/api/admin/providers", { credentials: "same-origin" })
			.then(async (res) => {
				const data = (await res.json().catch(() => ({}))) as { providers?: PlatformProvider[]; error?: string };
				if (!res.ok) throw new Error(data.error || "Could not load admin providers.");
				setProviders(data.providers ?? []);
			})
			.catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load admin providers."));
	}, [user]);

	async function saveProvider(event: React.FormEvent) {
		event.preventDefault();
		if (!apiKey.trim()) {
			setError("Enter a provider API key first.");
			return;
		}
		setBusy(true);
		setError(null);
		setMessage(null);
		try {
			const res = await fetch("/api/admin/providers", {
				method: "POST",
				headers: { "content-type": "application/json" },
				credentials: "same-origin",
				body: JSON.stringify({ provider: selected, apiKey, model, baseURL }),
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string; keyHint?: string };
			if (!res.ok) throw new Error(data.error || "Could not save provider.");
			setApiKey("");
			setMessage(`${selected} saved and validated (${data.keyHint ?? "masked key"}).`);
			const refreshed = await fetch("/api/admin/providers", { credentials: "same-origin" });
			const next = (await refreshed.json()) as { providers?: PlatformProvider[] };
			setProviders(next.providers ?? []);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not save provider.");
		} finally {
			setBusy(false);
		}
	}

	if (loading) {
		return <div className="mx-auto max-w-[1024px] px-4 py-16 text-sm text-base-content/60">Checking admin access…</div>;
	}

	if (!user) {
		return <div className="mx-auto max-w-[1024px] px-4 py-16"><h1 className="font-display text-3xl font-semibold">Sign in required</h1><p className="mt-3 text-base-content/65">Sign in with the admin account to configure hosted providers.</p></div>;
	}

	return (
		<AppShell active="settings">
			<div className="max-w-[760px]">
				<div className="mb-10">
					<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">Platform only</p>
					<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Hosted provider keys</h1>
					<p className="mt-3 max-w-[62ch] leading-7 text-base-content/65">
						Keys here are used only for paid Core and Voice plans. BYOK users continue using credentials saved in their own Settings.
					</p>
				</div>

				<form onSubmit={saveProvider} className="rounded-2xl border border-base-300 bg-base-100 p-6 sm:p-8">
					<label className="block text-sm font-semibold" htmlFor="admin-provider">Provider</label>
					<select id="admin-provider" value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-base-300 bg-base-100 px-3 text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25">
						{PROVIDERS.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
					</select>

					<label className="mt-5 block text-sm font-semibold" htmlFor="admin-model">Default model</label>
					<input id="admin-model" value={model} onChange={(event) => setModel(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-base-300 bg-base-100 px-3 text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25" />

					<label className="mt-5 block text-sm font-semibold" htmlFor="admin-base-url">Base URL <span className="font-normal text-base-content/50">(optional)</span></label>
					<input id="admin-base-url" value={baseURL} onChange={(event) => setBaseURL(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-base-300 bg-base-100 px-3 text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25" />

					<label className="mt-5 block text-sm font-semibold" htmlFor="admin-api-key">API key</label>
					<input id="admin-api-key" type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Enter a new key to replace the stored key" className="mt-2 h-12 w-full rounded-lg border border-base-300 bg-base-100 px-3 text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25" />
					<p className="mt-2 text-xs leading-5 text-base-content/55">The full key is sent only to the server, encrypted, and never returned to the browser.</p>

					{error && <p role="alert" className="mt-5 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</p>}
					{message && <p role="status" className="mt-5 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">{message}</p>}
					<Button type="submit" className="mt-6" disabled={busy}>{busy ? "Validating and saving…" : "Validate and save key"}</Button>
				</form>

				<section className="mt-8" aria-labelledby="configured-providers">
					<h2 id="configured-providers" className="font-display text-2xl font-semibold">Configured hosted providers</h2>
					{providers.length === 0 ? <p className="mt-3 text-sm text-base-content/60">No platform providers configured yet.</p> : <ul className="mt-4 divide-y divide-base-300 rounded-xl border border-base-300">{providers.map((provider) => <li key={provider.provider} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"><span className="font-semibold">{provider.provider}</span><span className="font-mono text-sm text-base-content/60">{provider.key_hint}</span></li>)}</ul>}
				</section>
			</div>
		</AppShell>
	);
}
