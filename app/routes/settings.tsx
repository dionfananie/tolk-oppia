import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/settings";
import { AppShell } from "~/components/AppShell";
import { Badge } from "~/components/Badge";
import { Button } from "~/components/Button";
import { Segmented } from "~/components/Segmented";
import { Switch } from "~/components/Switch";
import { ThemeToggle } from "~/components/ThemeToggle";
import { chat, defaultModel, PROVIDER_META, type ProviderName } from "~/lib/providers";
import {
	getSetup,
	loadPrefs,
	loadSettings,
	saveSettings,
	setSetup,
	type Settings as AppSettings,
} from "~/lib/storage";
import { getVoices, isSpeechSupported, isTtsSupported, speak, type Voice } from "~/lib/speech";
import { LEVEL_CEFR } from "~/lib/stats";
import { inputClass } from "~/lib/ui";
import type { EnglishLevel } from "~/data/scenarios";

export function meta({}: Route.MetaArgs) {
	return [{ title: "Settings · TOLK" }];
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return <h2 className="font-display text-[22px] font-semibold tracking-[-0.015em] text-ink">{children}</h2>;
}

export default function Settings() {
	const navigate = useNavigate();
	const [provider, setProvider] = useState<ProviderName>("deepseek");
	const [apiKey, setApiKey] = useState("");
	const [level, setLevel] = useState<EnglishLevel>("intermediate");
	const [connected, setConnected] = useState(false);
	const [status, setStatus] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [voices, setVoices] = useState<Voice[]>([]);
	const [mounted, setMounted] = useState(false);
	const [settings, setSettings] = useState<AppSettings>({
		captions: true,
		autoPlay: true,
		promptStyle: "encouraging",
		speechRate: "normal",
		voiceUri: "",
	});
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		const prefs = loadPrefs();
		const current = getSetup();
		if (prefs) setLevel(prefs.level);
		if (current) {
			setProvider(current.provider);
			setApiKey(current.apiKey);
			setConnected(Boolean(current.apiKey));
		} else if (prefs) {
			setProvider(prefs.provider);
		}
		setSettings(loadSettings());
		setHydrated(true);
		setMounted(true);
	}, []);

	useEffect(() => {
		if (hydrated) saveSettings(settings);
	}, [settings, hydrated]);

	useEffect(() => {
		const refresh = () => setVoices(getVoices());
		refresh();
		if (typeof window !== "undefined" && "speechSynthesis" in window) {
			window.speechSynthesis.onvoiceschanged = refresh;
			return () => {
				window.speechSynthesis.onvoiceschanged = null;
			};
		}
	}, []);

	function update<T extends keyof AppSettings>(key: T, value: AppSettings[T]) {
		setSettings((prev) => ({ ...prev, [key]: value }));
	}

	async function testConnection() {
		if (!apiKey.trim() || busy) return;
		setBusy(true);
		setStatus("Testing connection…");
		try {
			await chat(
				{ provider, apiKey: apiKey.trim(), model: defaultModel(provider) },
				[{ role: "user", content: "ping" }],
				{ maxTokens: 1 },
			);
			setStatus("Connection successful");
		} catch (cause) {
			setStatus(cause instanceof Error ? cause.message : "Connection failed");
		} finally {
			setBusy(false);
		}
	}

	function saveProvider() {
		if (!apiKey.trim()) {
			setStatus("Enter an API key to connect.");
			return;
		}
		setSetup({
			level,
			provider,
			model: defaultModel(provider),
			apiKey: apiKey.trim(),
			mode: loadPrefs()?.mode ?? "text",
		});
		setConnected(true);
		setStatus(`Connected to ${PROVIDER_META.find((p) => p.provider === provider)?.label}.`);
	}

	function testVoice() {
		speak("Hello, I'm your English coach. Let's practice.", { voiceUri: settings.voiceUri });
	}

	function signOut() {
		setSetup(null);
		navigate("/");
	}

	return (
		<AppShell active="settings">
			<div className="max-w-[620px]">
				<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
					Settings
				</p>
				<h1 className="mt-2 font-display text-[clamp(28px,3.4vw,40px)] font-semibold tracking-[-0.015em] text-ink">
					Settings
				</h1>
				<p className="mt-3 text-muted">
					Bring your own keys, tune your preferences, and manage this device.
				</p>
			</div>

			<section className="mt-6">
				<SectionTitle>AI provider</SectionTitle>
				<p className="mb-4 mt-1.5 text-sm text-muted">
					TOLK runs on your keys. Nothing is stored on our servers.
				</p>
				<div className="rounded-lg border border-line bg-paper p-6">
					<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
						<div>
							<p className="text-[15px] font-semibold text-ink">Active provider</p>
							<p className="mt-1 font-mono text-sm text-muted">
								{PROVIDER_META.find((p) => p.provider === provider)?.label}
							</p>
						</div>
						{connected && <Badge dot="success">Connected</Badge>}
					</div>

					<Segmented
						label="Provider"
						value={provider}
						onChange={(value) => {
							setProvider(value as ProviderName);
							setStatus("Not saved yet");
						}}
						options={PROVIDER_META.map((p) => ({ value: p.provider, label: p.label.split(" ")[0] }))}
					/>

					<div className="mt-4 flex flex-col gap-[7px]">
						<label htmlFor="api-key" className="text-sm font-medium text-ink">
							API key
						</label>
						<input
							id="api-key"
							type="password"
							autoComplete="off"
							spellCheck={false}
							placeholder="sk-…"
							value={apiKey}
							onChange={(event) => setApiKey(event.target.value)}
							className={inputClass}
						/>
					</div>

					{status && <p className="mt-3 rounded-md bg-surface px-3 py-2 text-sm text-ink-2">{status}</p>}

					<div className="mt-4 flex flex-wrap gap-3">
						<Button variant="secondary" onClick={() => void testConnection()} disabled={busy}>
							{busy ? "Testing…" : "Test Connection"}
						</Button>
						<Button onClick={saveProvider}>Save & Connect</Button>
					</div>
				</div>

				<div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-paper p-6">
					<div>
						<p className="text-[15px] font-semibold text-ink">Prompting style</p>
						<p className="mt-1 text-sm text-muted">How your coach phrases guidance.</p>
					</div>
					<Segmented
						label="Prompting style"
						value={settings.promptStyle}
						onChange={(value) => update("promptStyle", value as AppSettings["promptStyle"])}
						options={[
							{ value: "direct", label: "Direct" },
							{ value: "encouraging", label: "Encouraging" },
						]}
					/>
				</div>
			</section>

			<section className="mt-8">
				<SectionTitle>Voice</SectionTitle>
				<p className="mb-4 mt-1.5 text-sm text-muted">
					Voice uses your browser's speech tools. No API key needed.
				</p>
				<div className="rounded-lg border border-line bg-paper">
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft p-5">
						<div>
							<p className="text-[15px] font-semibold text-ink">Speech-to-text</p>
							<p className="mt-1 text-sm text-muted">Transcribes your spoken turns.</p>
						</div>
						<Badge dot={mounted && isSpeechSupported() ? "success" : "muted"}>
							{!mounted
								? "Checking…"
								: isSpeechSupported()
									? "Browser · available"
									: "Browser · unsupported"}
						</Badge>
					</div>
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft p-5">
						<div>
							<p className="text-[15px] font-semibold text-ink">Voice</p>
							<p className="mt-1 text-sm text-muted">Your coach&rsquo;s speaking voice.</p>
						</div>
						<select
							value={settings.voiceUri}
							onChange={(event) => update("voiceUri", event.target.value)}
							disabled={!mounted || !isTtsSupported()}
							className={`${inputClass} max-w-[260px]`}
						>
							<option value="">Default voice</option>
							{voices.map((voice) => (
								<option key={voice.uri} value={voice.uri}>
									{voice.name} · {voice.lang}
								</option>
							))}
						</select>
					</div>
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft p-5">
						<div>
							<p className="text-[15px] font-semibold text-ink">Speaking speed</p>
							<p className="mt-1 text-sm text-muted">How fast responses are read aloud.</p>
						</div>
						<Segmented
							label="Speaking speed"
							value={settings.speechRate}
							onChange={(value) => update("speechRate", value as AppSettings["speechRate"])}
							options={[
								{ value: "slow", label: "Slow" },
								{ value: "normal", label: "Normal" },
								{ value: "fast", label: "Fast" },
							]}
						/>
					</div>
					<div className="flex flex-wrap items-center justify-between gap-3 p-5">
						<div>
							<p className="text-[15px] font-semibold text-ink">Test Voice</p>
							<p className="mt-1 text-sm text-muted">Hear the selected voice read a sample.</p>
						</div>
						<Button variant="secondary" onClick={testVoice} disabled={!mounted || !isTtsSupported()}>
							Test Voice
						</Button>
					</div>
				</div>
			</section>

			<section className="mt-8">
				<SectionTitle>Conversation defaults</SectionTitle>
				<div className="mt-4 rounded-lg border border-line bg-paper">
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft p-5">
						<div>
							<p className="text-[15px] font-semibold text-ink">Captions</p>
							<p className="mt-1 text-sm text-muted">Show the live transcript in conversations.</p>
						</div>
						<Switch checked={settings.captions} onChange={(v) => update("captions", v)} id="settings-captions" />
					</div>
					<div className="flex flex-wrap items-center justify-between gap-3 p-5">
						<div>
							<p className="text-[15px] font-semibold text-ink">Auto-play responses</p>
							<p className="mt-1 text-sm text-muted">Read the coach&rsquo;s reply without pressing play.</p>
						</div>
						<Switch checked={settings.autoPlay} onChange={(v) => update("autoPlay", v)} id="settings-autoplay" />
					</div>
				</div>
			</section>

			<section className="mt-8">
				<SectionTitle>Appearance</SectionTitle>
				<div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-paper p-5">
					<div>
						<p className="text-[15px] font-semibold text-ink">Theme</p>
						<p className="mt-1 text-sm text-muted">Switch between light and dark mode.</p>
					</div>
					<ThemeToggle />
				</div>
			</section>

			<section className="mt-8">
				<SectionTitle>Account</SectionTitle>
				<div className="mt-4 overflow-hidden rounded-lg border border-line bg-paper">
					<div className="flex items-center gap-4 border-b border-line-soft p-5">
						<span className="grid size-8 flex-none place-items-center rounded-full bg-surface text-xs font-semibold text-ink-2">
							{LEVEL_CEFR[level]}
						</span>
						<div>
							<p className="text-sm font-semibold text-ink">Local profile</p>
							<p className="mt-0.5 text-sm text-muted">
								Level {LEVEL_CEFR[level]} · data stays on this device
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={signOut}
						className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-warm focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper focus:outline-none"
					>
						<div>
							<p className="text-sm font-semibold text-danger">Sign out</p>
							<p className="mt-0.5 text-sm text-muted">Clears the provider key from this session.</p>
						</div>
					</button>
				</div>
			</section>

			<section className="mt-8">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="font-mono text-[13px] text-muted">TOLK v0.1.0</p>
						<p className="mt-1 text-sm text-muted">Data and conversations stay on this device.</p>
					</div>
					<Button to="/" variant="secondary">
						App overview
					</Button>
				</div>
			</section>
		</AppShell>
	);
}
