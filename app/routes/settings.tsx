import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/settings";
import { AppShell } from "~/components/AppShell";
import { Badge } from "~/components/Badge";
import { Button } from "~/components/Button";
import { Segmented } from "~/components/Segmented";
import { Switch } from "~/components/Switch";
import { ThemeToggle } from "~/components/ThemeToggle";
import {
	ProviderSetupForm,
	type ProviderFormValue,
} from "~/components/ProviderSetupForm";
import { chat, defaultModel, providerLabel } from "~/lib/providers";
import {
	fetchServerSetup,
	saveServerSetup,
	clearServerSetup,
	useAuth,
	googleLoginUrl,
} from "~/lib/auth";
import {
	getSetup,
	loadPrefs,
	loadSettings,
	saveLocalApiKey,
	saveSettings,
	setSetup,
	setupReady,
	type Setup,
} from "~/lib/storage";
import { getVoices, isSpeechSupported, isTtsSupported, speak, type Voice } from "~/lib/speech";
import { LEVEL_CEFR } from "~/lib/stats";
import type { EnglishLevel } from "~/data/scenarios";

export function meta({}: Route.MetaArgs) {
	return [{ title: "Settings · TOLK" }];
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return <h2 className="font-display text-[22px] font-semibold tracking-[-0.015em] text-ink">{children}</h2>;
}

export default function Settings() {
	const navigate = useNavigate();
	const { user, loading: authLoading, refresh: refreshAuth } = useAuth();
	const [provider, setProvider] = useState<Setup | null>(() => getSetup());
	const [connected, setConnected] = useState(() => setupReady(getSetup()));
	const [status, setStatus] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [voices, setVoices] = useState<Voice[]>([]);
	const [mounted, setMounted] = useState(false);
	const [serverSetupLoaded, setServerSetupLoaded] = useState(false);
	const [settings, setSettings] = useState({
		captions: true,
		autoPlay: true,
		promptStyle: "encouraging" as "direct" | "encouraging",
		speechRate: "normal" as "slow" | "normal" | "fast",
		voiceUri: "",
	});
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		const prefs = loadPrefs();
		const current = getSetup();
		if (prefs && !current) {
			// recover prefs (tanpa key) sebagai base provider/model
			setProvider((p) => p ?? { ...prefs, model: prefs.model });
			setConnected(setupReady(prefs));
		}
		setSettings(loadSettings());
		setHydrated(true);
		setMounted(true);
	}, []);

	useEffect(() => {
		if (hydrated) saveSettings(settings);
	}, [settings, hydrated]);

	// Setelah auth selesai & login, tarik setup server (provider/model + hasKey).
	useEffect(() => {
		if (authLoading || !user) return;
		async function loadServer() {
			const serverSetup = await fetchServerSetup();
			if (serverSetup) {
				setProvider((p) => ({
					level: p?.level ?? "intermediate",
					provider: serverSetup.provider as Setup["provider"],
					model: serverSetup.model,
					serverKey: serverSetup.hasKey,
					mode: p?.mode ?? "text",
				}));
				setConnected(serverSetup.hasKey);
			}
			setServerSetupLoaded(true);
		}
		void loadServer();
	}, [authLoading, user]);

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

	const update = useCallback(
		<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
			setSettings((prev) => ({ ...prev, [key]: value }));
		},
		[],
	);

	// Simpan dari form. Route: login → server; belum login → BYOK lokal.
	async function applyProviderValue(value: ProviderFormValue) {
		if (user) {
			const ok = await saveServerSetup({
				provider: value.provider,
				model: value.model,
				apiKey: value.apiKey,
			});
			if (!ok) {
				setStatus("Gagal menyimpan key di server. Coba lagi.");
				return;
			}
			// key tak perlu di-hold di client — pakai relay server.
			const next: Setup = {
				level: provider?.level ?? "intermediate",
				provider: value.provider,
				model: value.model,
				serverKey: true,
				mode: provider?.mode ?? "text",
			};
			setSetup(next);
			setProvider(next);
			setConnected(true);
			setStatus(`Tersimpan di akun — key tak perlu diisi lagi. Model: ${value.model}.`);
		} else {
			// BYOK lokal
			if (!value.apiKey) {
				setStatus("Login atau isi key OpenRouter untuk menyambung.");
				return;
			}
			saveLocalApiKey(value.apiKey);
			const next: Setup = {
				level: provider?.level ?? "intermediate",
				provider: value.provider,
				model: value.model,
				apiKey: value.apiKey,
				mode: provider?.mode ?? "text",
			};
			setSetup(next);
			setProvider(next);
			setConnected(true);
			setStatus(`Key disimpan di browser ini (BYOK lokal). Model: ${value.model}.`);
		}
	}

	async function testConnection() {
		if (!provider || !provider.model || busy) return;
		setBusy(true);
		setStatus("Testing connection…");
		try {
			await chat(
				{
					provider: provider.provider,
					model: provider.model,
					...(provider.apiKey ? { apiKey: provider.apiKey } : {}),
				},
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

	function testVoice() {
		speak("Hello, I'm your English coach. Let's practice.", { voiceUri: settings.voiceUri });
	}

	async function signOut() {
		if (user) await clearServerSetup();
		setSetup(null);
		setConnected(false);
		setStatus(null);
		navigate("/");
	}

	const activeProviderLabel = provider ? providerLabel(provider.provider) : "—";
	const hasStoredKey = Boolean(user && provider?.serverKey);

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
					Bring your own AI keys, tune preferences, and sign in for cross-device keys.
				</p>
			</div>

			<section className="mt-6">
				<SectionTitle>AI provider</SectionTitle>
				<p className="mb-4 mt-1.5 text-sm text-muted">
					TOLK runs on OpenRouter with your key — login untuk simpan key di server (tanpa
					input ulang), atau pakai BYOK lokal tanpa akun.
				</p>

				<div className="rounded-lg border border-line bg-paper p-6">
					<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
						<div>
							<p className="text-[15px] font-semibold text-ink">Active provider</p>
							<p className="mt-1 font-mono text-sm text-muted">
								{provider ? `${activeProviderLabel} · ${provider.model}` : "Belum dikonfigurasi"}
							</p>
						</div>
						{connected ? (
							<Badge dot="success">
								{hasStoredKey ? "Server key" : "Connected (local)"}
							</Badge>
						) : (
							<Badge dot="muted">Not connected</Badge>
						)}
					</div>

					{hasStoredKey && (
						<p className="mb-4 rounded-md bg-surface px-3 py-2.5 text-sm text-ink-2">
							Key tersimpan aman di server untuk {user?.email}. Key tak ditampilkan &
							tak diupload lagi. Ubah provider/model di bawah; ganti key lagi lewat
							&quot;Ganti key&quot;.
						</p>
					)}

					<ProviderSetupForm
						initial={
							provider
								? {
										provider: provider.provider,
										model: provider.model,
										...(provider.apiKey ? { apiKey: provider.apiKey } : {}),
									}
								: null
						}
						hasStoredKey={hasStoredKey}
						onSave={(value) => void applyProviderValue(value)}
					/>
					{hasStoredKey && (
						<button
							type="button"
							onClick={() => setStatus("Mode ganti key: isi ulang key di form server ini.")}
							className="mt-2 text-sm font-semibold text-accent transition hover:text-accent-dark"
						>
							Ganti key…
						</button>
					)}

					{status && <p className="mt-3 rounded-md bg-surface px-3 py-2 text-sm text-ink-2">{status}</p>}

					<div className="mt-4 flex flex-wrap gap-3">
						<Button variant="secondary" onClick={() => void testConnection()} disabled={busy}>
							{busy ? "Testing…" : "Test Connection"}
						</Button>
					</div>
				</div>
			</section>

			{!user && !authLoading && (
				<section className="mt-6">
					<div className="rounded-lg border border-line bg-paper p-6">
						<p className="text-[15px] font-semibold text-ink">Simpan key ke akun</p>
						<p className="mt-1 text-sm text-muted">
							Login dengan Google untuk menyimpan key OpenRouter secara aman di server —
							tanpa perlu input ulang di perangkat lain.
						</p>
						<Button
							to={googleLoginUrl(window.location.pathname + window.location.search)}
							variant="secondary"
							className="mt-4"
						>
							Continue with Google
						</Button>
					</div>
				</section>
			)}

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
							className="max-w-[260px] rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink"
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
							onChange={(value) => update("speechRate", value as typeof settings.speechRate)}
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
					{user ? (
						<div className="flex items-center gap-4 border-b border-line-soft p-5">
							{user.avatar_url ? (
								<img
									src={user.avatar_url}
									alt=""
									className="size-9 flex-none rounded-full object-cover"
								/>
							) : (
								<span className="grid size-9 flex-none place-items-center rounded-full bg-surface text-xs font-semibold text-ink-2">
									{(user.name || "U").slice(0, 1).toUpperCase()}
								</span>
							)}
							<div className="min-w-0">
								<p className="truncate text-[15px] font-semibold text-ink">{user.name || "User"}</p>
								<p className="truncate text-sm text-muted">{user.email}</p>
							</div>
						</div>
					) : (
						<div className="border-b border-line-soft p-5">
							<p className="text-sm font-semibold text-ink">Local profile</p>
							<p className="mt-0.5 text-sm text-muted">
								Belum login. Data & key BYOK hanya tersimpan di perangkat ini.
							</p>
						</div>
					)}
					{user ? (
						<button
							type="button"
							onClick={() => void signOut()}
							className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-warm focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper focus:outline-none"
						>
							<div>
								<p className="text-sm font-semibold text-danger">Sign out</p>
								<p className="mt-0.5 text-sm text-muted">
									Hapus key server (jika ada) & sesi dari perangkat ini.
								</p>
							</div>
						</button>
					) : (
						<Button
							to={googleLoginUrl(window.location.pathname + window.location.search)}
							className="m-4 w-full"
						>
							Continue with Google
						</Button>
					)}
					{!user && (
						<div className="px-5 pb-4">
							<button
								type="button"
								onClick={() => {
									setSetup(null);
									saveLocalApiKey("");
									setConnected(false);
									setStatus("Key lokal dihapus.");
								}}
								className="text-sm font-semibold text-danger"
							>
								Hapus key lokal
							</button>
						</div>
					)}
				</div>
			</section>

			<section className="mt-8">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="font-mono text-[13px] text-muted">TOLK v0.2.0</p>
						<p className="mt-1 text-sm text-muted">
							Login = key server (cross-device). Tanpa login = BYOK lokal.
						</p>
					</div>
					<Button to="/" variant="secondary">
						App overview
					</Button>
				</div>
			</section>
		</AppShell>
	);
}
