import { useEffect, useState } from "react";
import type { Route } from "./+types/admin";
import { AppShell } from "~/components/AppShell";
import { Button } from "~/components/Button";
import { useAuth } from "~/lib/auth";

export function meta({}: Route.MetaArgs) {
	return [{ title: "Admin · TOLK" }];
}

type Config = {
	scope: "llm" | "voice";
	provider: string;
	label: string;
	default_model: string | null;
	stt_model: string | null;
	tts_model: string | null;
	base_url: string | null;
	key_hint: string;
	enabled: number;
	last_validated_at: number | null;
};

const DEFAULT_LLM = {
	model: "deepseek-v4-flash",
	baseURL: "https://api.deepseek.com/v1",
};

const DEFAULT_VOICE = {
	sttModel: "qwen3-asr-flash",
	ttsModel: "qwen3-tts-flash",
	baseURL: "https://dashscope-intl.aliyuncs.com/api/v1",
};

export default function Admin() {
	const { user, loading } = useAuth();
	const [configs, setConfigs] = useState<Config[]>([]);
	const [llmKey, setLlmKey] = useState("");
	const [llmModel, setLlmModel] = useState(DEFAULT_LLM.model);
	const [llmBaseURL, setLlmBaseURL] = useState(DEFAULT_LLM.baseURL);
	const [voiceKey, setVoiceKey] = useState("");
	const [sttModel, setSttModel] = useState(DEFAULT_VOICE.sttModel);
	const [ttsModel, setTtsModel] = useState(DEFAULT_VOICE.ttsModel);
	const [voiceBaseURL, setVoiceBaseURL] = useState(DEFAULT_VOICE.baseURL);
	const [busy, setBusy] = useState<"llm" | "voice" | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function loadConfigs() {
		const response = await fetch("/api/admin/config", { credentials: "same-origin" });
		const data = (await response.json().catch(() => ({}))) as { configs?: Config[]; error?: string };
		if (!response.ok) throw new Error(data.error || "Could not load hosted configuration.");
		setConfigs(data.configs ?? []);
	}

	useEffect(() => {
		if (!user) return;
		void loadConfigs().catch((cause) => {
			setError(cause instanceof Error ? cause.message : "Could not load hosted configuration.");
		});
	}, [user]);

	async function save(scope: "llm" | "voice") {
		const apiKey = scope === "llm" ? llmKey.trim() : voiceKey.trim();
		if (!apiKey) {
			setError(scope === "llm" ? "Masukkan DeepSeek API key." : "Masukkan Alibaba Cloud API key.");
			return;
		}
		setBusy(scope);
		setError(null);
		setMessage(null);
		try {
			const body = scope === "llm"
				? { scope, apiKey, model: llmModel, baseURL: llmBaseURL }
				: { scope, apiKey, sttModel, ttsModel, baseURL: voiceBaseURL };
			const response = await fetch("/api/admin/config", {
				method: "POST",
				credentials: "same-origin",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			});
			const data = (await response.json().catch(() => ({}))) as { error?: string; keyHint?: string };
			if (!response.ok) throw new Error(data.error || "Could not validate and save configuration.");
			if (scope === "llm") setLlmKey("");
			else setVoiceKey("");
			setMessage(`${scope === "llm" ? "Hosted LLM" : "Hosted Voice"} tersimpan dan tervalidasi (${data.keyHint ?? "masked key"}).`);
			await loadConfigs();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not save hosted configuration.");
		} finally {
			setBusy(null);
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
			<div className="max-w-[820px]">
				<div className="mb-10">
					<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">Platform only</p>
					<h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Hosted configuration</h1>
					<p className="mt-3 max-w-[62ch] leading-7 text-base-content/65">BYOK tetap memakai key user. Konfigurasi di halaman ini hanya dipakai oleh paket hosted berbayar.</p>
				</div>

				<div className="grid gap-6 lg:grid-cols-2">
					<section className="rounded-2xl border border-base-300 bg-base-100 p-6 sm:p-8" aria-labelledby="hosted-llm">
						<h2 id="hosted-llm" className="font-display text-2xl font-semibold">Hosted LLM</h2>
						<p className="mt-2 text-sm leading-6 text-base-content/60">DeepSeek dipakai untuk model AI agent hosted.</p>
						<label className="mt-6 block text-sm font-semibold" htmlFor="llm-model">Model</label>
						<input id="llm-model" value={llmModel} onChange={(event) => setLlmModel(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-base-300 bg-base-100 px-3" />
						<label className="mt-4 block text-sm font-semibold" htmlFor="llm-url">Base URL</label>
						<input id="llm-url" value={llmBaseURL} onChange={(event) => setLlmBaseURL(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-base-300 bg-base-100 px-3" />
						<label className="mt-4 block text-sm font-semibold" htmlFor="llm-key">DeepSeek API key</label>
						<input id="llm-key" type="password" autoComplete="new-password" value={llmKey} onChange={(event) => setLlmKey(event.target.value)} placeholder="Masukkan key baru" className="mt-2 h-11 w-full rounded-lg border border-base-300 bg-base-100 px-3" />
						<Button type="button" className="mt-6" disabled={busy !== null} onClick={() => void save("llm")}>{busy === "llm" ? "Validating…" : "Validate and save"}</Button>
					</section>

					<section className="rounded-2xl border border-base-300 bg-base-100 p-6 sm:p-8" aria-labelledby="hosted-voice">
						<h2 id="hosted-voice" className="font-display text-2xl font-semibold">Hosted STT + TTS</h2>
						<p className="mt-2 text-sm leading-6 text-base-content/60">Satu Alibaba Cloud key dipakai bersama untuk Qwen ASR dan Qwen TTS.</p>
						<label className="mt-6 block text-sm font-semibold" htmlFor="voice-stt">STT model</label>
						<input id="voice-stt" value={sttModel} onChange={(event) => setSttModel(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-base-300 bg-base-100 px-3" />
						<label className="mt-4 block text-sm font-semibold" htmlFor="voice-tts">TTS model</label>
						<input id="voice-tts" value={ttsModel} onChange={(event) => setTtsModel(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-base-300 bg-base-100 px-3" />
						<label className="mt-4 block text-sm font-semibold" htmlFor="voice-url">Base URL</label>
						<input id="voice-url" value={voiceBaseURL} onChange={(event) => setVoiceBaseURL(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-base-300 bg-base-100 px-3" />
						<label className="mt-4 block text-sm font-semibold" htmlFor="voice-key">Alibaba Cloud API key</label>
						<input id="voice-key" type="password" autoComplete="new-password" value={voiceKey} onChange={(event) => setVoiceKey(event.target.value)} placeholder="Masukkan key baru" className="mt-2 h-11 w-full rounded-lg border border-base-300 bg-base-100 px-3" />
						<Button type="button" className="mt-6" disabled={busy !== null} onClick={() => void save("voice")}>{busy === "voice" ? "Validating…" : "Validate and save"}</Button>
					</section>
				</div>

				{error && <p role="alert" className="mt-6 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</p>}
				{message && <p role="status" className="mt-6 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">{message}</p>}
				<section className="mt-8" aria-labelledby="configured"><h2 id="configured" className="font-display text-2xl font-semibold">Configured scopes</h2>{configs.length === 0 ? <p className="mt-3 text-sm text-base-content/60">Belum ada konfigurasi platform.</p> : <ul className="mt-4 divide-y divide-base-300 rounded-xl border border-base-300">{configs.map((config) => <li key={config.scope} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"><span><strong>{config.scope === "llm" ? "Hosted LLM · DeepSeek" : "Hosted Voice · Alibaba Qwen"}</strong><br /><span className="text-sm text-base-content/60">{config.key_hint}</span></span><span className="text-sm text-success">Validated</span></li>)}</ul>}</section>
			</div>
		</AppShell>
	);
}
