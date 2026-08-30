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
import { chat, defaultModel, providerLabel, PROVIDER_META, type ProviderName } from "~/lib/providers";
import {
	saveServerKey,
	deleteServerKey,
	setDefaultServerKey,
	fetchServerKeys,
	useAuth,
	googleLoginUrl,
	type StoredKey,
} from "~/lib/auth";
import {
	getSetup,
	loadPrefs,
	loadSettings,
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

/** Return-ke path saat ini utk link Google login — aman utk SSR (tanpa window). */
function currentReturnTo(): string {
	return typeof window !== "undefined"
		? window.location.pathname + window.location.search
		: "/settings";
}

/** Label ramah utk provider (cek PROVIDER_META; fallback ke raw id). */
function providerLabelSafe(id: string): string {
	const meta = PROVIDER_META.find((p) => p.provider === id);
	return meta?.label ?? id;
}

export default function Settings() {
	const navigate = useNavigate();
	const { user, loading: authLoading, refresh: refreshAuth } = useAuth();
	const [provider, setProvider] = useState<Setup | null>(() => getSetup());
	const [keys, setKeys] = useState<StoredKey[]>([]);
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
	const [addingKey, setAddingKey] = useState(false);

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

	// Setelah auth selesai & login, tarik semua key provider dari server.
	useEffect(() => {
		if (authLoading || !user) return;
		async function loadKeys() {
			const serverKeys = await fetchServerKeys();
			setKeys(serverKeys ?? []);
			const def = (serverKeys ?? []).find((k) => k.isDefault) ?? (serverKeys ?? [])[0];
			if (def) {
				setProvider((p) => ({
					level: p?.level ?? "intermediate",
					provider: def.provider as Setup["provider"],
					model: def.model,
					serverKey: true,
					mode: p?.mode ?? "text",
				}));
				setConnected(true);
			}
			setServerSetupLoaded(true);
		}
		void loadKeys();
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

	// Simpan key provider ke server (login + validasi server-side). Lalu refresh list & set aktif.
	async function applyProviderValue(value: ProviderFormValue) {
		if (!user) return;
		if (!value.apiKey) {
			setStatus("Masukkan API key untuk menyimpan provider baru.");
			return;
		}
		setBusy(true);
		const r = await saveServerKey({
			provider: value.provider,
			apiKey: value.apiKey,
			model: value.model,
			...(value.baseURL ? { baseURL: value.baseURL } : {}),
		});
		setBusy(false);
		if (!r.ok) {
			setStatus(r.error || "Gagal menyimpan key. Periksa kembali.");
			return;
		}
		const serverKeys = await fetchServerKeys();
		setKeys(serverKeys ?? []);
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
		setAddingKey(false);
		setStatus(`Key ${providerLabel(value.provider)} tersimpan & tervalidasi.`);
	}

	async function testConnection() {
		if (!provider || !provider.model || busy) return;
		if (!provider.serverKey) {
			setStatus("Belum ada key tersimpan. Simpan key provider dulu untuk menguji koneksi.");
			return;
		}
		setBusy(true);
		setStatus("Testing connection…");
		try {
			await chat(
				{
					provider: provider.provider,
					model: provider.model,
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
		setSetup(null);
		setProvider(null);
		setKeys([]);
		setConnected(false);
		setStatus(null);
		navigate("/");
	}

	async function handleRemoveKey(p: string) {
		if (!user) return;
		await deleteServerKey(p);
		const serverKeys = await fetchServerKeys();
		setKeys(serverKeys ?? []);
		// Jika provider aktif dihapus, kosongkan connected.
		if (provider?.provider === p) {
			const def = serverKeys?.find((k) => k.isDefault) ?? serverKeys?.[0];
			if (def) {
				setProvider((prev) => ({
					level: prev?.level ?? "intermediate",
					provider: def.provider as Setup["provider"],
					model: def.model,
					serverKey: true,
					mode: prev?.mode ?? "text",
				}));
			} else {
				setProvider(null);
				setConnected(false);
			}
		}
		setStatus(`Key ${p} dihapus.`);
	}

	async function handleMakeDefault(p: string) {
		if (!user) return;
		await setDefaultServerKey(p);
		setKeys((prev) =>
			prev.map((k) => ({ ...k, isDefault: k.provider === p })),
		);
	}

	const activeProviderLabel = provider ? providerLabel(provider.provider) : "—";
	const connectedCount = keys.length;

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
				<SectionTitle>AI providers</SectionTitle>
				<p className="mb-4 mt-1.5 text-sm text-muted">
					Mengelola beberapa API key (BYOK). Key divalidasi lalu disimpan terenkripsi di
					server TOLK; dipakai server saat chat — tidak pernah dari browser. Login untuk
					mengelola key.
				</p>

				{!user && !authLoading ? (
					<div className="rounded-lg border border-line bg-paper p-6">
						<p className="text-[15px] font-semibold text-ink">Simpan key ke akun</p>
						<p className="mt-1 text-sm text-muted">
							Login dengan Google untuk menyimpan & mengelola API key secara aman di server —
							cross-device, tanpa input ulang.
						</p>
						<Button
							to={googleLoginUrl(currentReturnTo())}
							variant="secondary"
							className="mt-4"
						>
							Continue with Google
						</Button>
					</div>
				) : (
					<div className="rounded-lg border border-line bg-paper p-6">
						{/* Active/default provider */}
						<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
							<div>
								<p className="text-[15px] font-semibold text-ink">Active provider</p>
								<p className="mt-1 font-mono text-sm text-muted">
									{provider
										? `${activeProviderLabel} · ${provider.model}`
										: connectedCount > 0
											? "Pilih provider default di bawah"
											: "Belum ada key tersimpan"}
								</p>
							</div>
							{connected ? (
								<Badge dot="success">
									{connectedCount} key{connectedCount > 1 ? "s" : ""} tersimpan
								</Badge>
							) : (
								<Badge dot="muted">Not connected</Badge>
							)}
						</div>

						{/* Connected providers list */}
						{keys.length > 0 && (
							<div className="mb-4 space-y-2.5">
								<p className="text-sm font-semibold text-ink-2">Connected providers</p>
								{keys.map((k) => (
									<div
										key={k.provider}
										className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3.5 py-3"
									>
										<div className="min-w-0">
											<p className="text-sm font-semibold text-ink">
												{providerLabelSafe(k.provider)}
												{k.isDefault && <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-[11px] font-semibold text-accent">default</span>}
											</p>
											<p className="mt-0.5 truncate font-mono text-xs text-muted">
												{k.keyHint} · {k.model}
											</p>
										</div>
										<div className="flex flex-none items-center gap-3">
											{!k.isDefault && (
												<button
													type="button"
													onClick={() => void handleMakeDefault(k.provider)}
													className="text-xs font-semibold text-accent transition hover:text-accent-dark"
												>
													Jadikan default
												</button>
											)}
											<button
												type="button"
												onClick={() => void handleRemoveKey(k.provider)}
												className="text-xs font-semibold text-danger transition hover:opacity-80"
											>
												Hapus
											</button>
										</div>
									</div>
								))}
							</div>
						)}

						{/* Add/replace key form */}
						{!addingKey ? (
							<Button
								variant="secondary"
								onClick={() => {
									setAddingKey(true);
									setStatus(null);
								}}
								className="w-full"
							>
								+ Tambah / ganti key provider
							</Button>
						) : (
							<>
								<div className="mb-3 flex items-center justify-between">
									<p className="text-sm font-semibold text-ink">Tambah / ganti key</p>
									<button
										type="button"
										onClick={() => setAddingKey(false)}
										className="text-sm font-semibold text-muted transition hover:text-ink"
									>
										Batal
									</button>
								</div>
								<ProviderSetupForm
									key={provider?.provider ?? "new"}
									initial={
										provider
											? { provider: provider.provider, model: provider.model }
											: null
									}
									onSave={(value) => void applyProviderValue(value)}
								/>
							</>
						)}

						{status && (
							<p className="mt-3 rounded-md bg-surface px-3 py-2 text-sm text-ink-2">{status}</p>
						)}

						<div className="mt-4 flex flex-wrap gap-3">
							<Button variant="secondary" onClick={() => void testConnection()} disabled={busy || !connected}>
								{busy ? "Testing…" : "Test Connection"}
							</Button>
						</div>
					</div>
				)}
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
								Belum login. Sign in untuk mengelola API key & menyimpan progress
								cross-device.
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
									Keluar dari sesi di perangkat ini. API key tetap tersimpan di akun.
								</p>
							</div>
						</button>
					) : (
						<Button
							to={googleLoginUrl(currentReturnTo())}
							className="m-4 w-full"
						>
							Continue with Google
						</Button>
					)}
				</div>
			</section>

			<section className="mt-8">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="font-mono text-[13px] text-muted">TOLK v0.2.0</p>
						<p className="mt-1 text-sm text-muted">
							BYOK multi-provider — key disimpan terenkripsi di server, dipakai server
							saat chat.
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
