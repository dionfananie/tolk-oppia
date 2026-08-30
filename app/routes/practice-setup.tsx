import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/practice-setup";
import { AppShell } from "~/components/AppShell";
import { Button } from "~/components/Button";
import { Segmented } from "~/components/Segmented";
import { ProviderSetupForm, type ProviderFormValue } from "~/components/ProviderSetupForm";
import { saveServerKey, useAuth, fetchServerKeys, googleLoginUrl } from "~/lib/auth";
import { getScenario, type EnglishLevel } from "~/data/scenarios";
import { isSpeechSupported } from "~/lib/speech";
import {
	clearDraft,
	getSetup,
	loadDraft,
	loadPrefs,
	saveDraft,
	setSetup,
	setupReady,
	type Setup,
} from "~/lib/storage";
import { inputClass } from "~/lib/ui";

export function meta({ params }: Route.MetaArgs) {
	const scenario = getScenario(params.scenarioId ?? "");
	return [{ title: scenario ? `${scenario.title} · Practice setup` : "Practice setup · TOLK" }];
}

const DIFFICULTIES: { value: EnglishLevel; label: string }[] = [
	{ value: "beginner", label: "Beginner" },
	{ value: "intermediate", label: "Intermediate" },
	{ value: "advanced", label: "Advanced" },
];

const DURATIONS = ["5", "10", "15"];

function nearestDuration(min: number): string {
	const options = [5, 10, 15];
	const best = options.reduce((a, b) => (Math.abs(b - min) < Math.abs(a - min) ? b : a));
	return String(best);
}

export default function PracticeSetup() {
	const { scenarioId } = useParams();
	const navigate = useNavigate();
	const scenario = scenarioId ? getScenario(scenarioId) : undefined;

	const existing = getSetup();
	const { user, loading: authLoading } = useAuth();
	const [userRole, setUserRole] = useState(scenario?.userRole ?? "");
	const [aiRole, setAiRole] = useState(scenario?.aiRole ?? "");
	const [goal, setGoal] = useState(scenario?.objective ?? "");
	const [difficulty, setDifficulty] = useState<EnglishLevel>(
		scenario?.difficulty ?? "intermediate",
	);
	const [duration, setDuration] = useState(nearestDuration(scenario?.durationMin ?? 10));
	const [mode, setMode] = useState<"voice" | "text">(() => {
		if (existing?.mode) return existing.mode;
		return loadPrefs()?.mode ?? (isSpeechSupported() ? "voice" : "text");
	});
	const [provider, setProvider] = useState<Setup | null>(existing);
	const [configured, setConfigured] = useState(setupReady(existing));

	useEffect(() => {
		if (!scenario) navigate("/practice", { replace: true });
	}, [scenario, navigate]);

	useEffect(() => {
		if (!scenario) return;
		const draft = loadDraft();
		if (draft?.scenarioId === scenario.id) {
			if (draft.userRole) setUserRole(draft.userRole);
			if (draft.aiRole) setAiRole(draft.aiRole);
			if (draft.objective) setGoal(draft.objective);
			setDuration(nearestDuration(draft.durationMin));
			setMode(draft.mode);
		}
	}, [scenario]);

	// Tarik key server saat login — agar tak perlu input key lagi utk mulai practice.
	useEffect(() => {
		if (authLoading || !user) return;
		async function loadServerSetup() {
			const keys = await fetchServerKeys();
			if (keys && keys.length > 0) {
				// Ambil default pertama (atau is_default pertama). Provider/model dari key.
				const def = keys.find((k) => k.isDefault) ?? keys[0];
				setProvider((prev) => ({
					level: prev?.level ?? difficulty,
					provider: def.provider as Setup["provider"],
					model: def.model,
					serverKey: true,
					mode: prev?.mode ?? mode,
				}));
				setConfigured(true);
			}
		}
		void loadServerSetup();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [authLoading, user]);

	if (!scenario) return null;

	function start() {
		if (!scenario) return;
		const base = provider ?? existing;
		if (!setupReady(base) || !base) return;
		const setup: Setup = {
			level: difficulty,
			provider: base.provider,
			model: base.model,
			...(base.serverKey ? { serverKey: base.serverKey } : {}),
			mode,
		};
		setSetup(setup);
		saveDraft({
			scenarioId: scenario.id,
			userRole: userRole.trim(),
			aiRole: aiRole.trim(),
			objective: goal.trim(),
			durationMin: Number(duration),
			mode,
		});
		navigate(`/practice/${scenario.id}`);
	}

	return (
		<AppShell active="practice">
			<div className="mx-auto max-w-[680px]">
				<div className="max-w-[620px]">
					<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
						Practice setup
					</p>
					<h1 className="mt-2 font-display text-[clamp(28px,3.4vw,40px)] font-semibold tracking-[-0.015em] text-ink">
						{scenario.title}
					</h1>
					<p className="mt-3 text-muted">Two quick choices and you&rsquo;re in.</p>
				</div>

				<div className="mt-6 rounded-lg border border-line bg-paper p-6">
					<div className="grid gap-5 sm:grid-cols-2">
						<div className="flex flex-col gap-[7px]">
							<label htmlFor="your-role" className="text-sm font-semibold text-ink">
								Your role
							</label>
							<input
								id="your-role"
								type="text"
								value={userRole}
								onChange={(event) => setUserRole(event.target.value)}
								className={inputClass}
							/>
						</div>
						<div className="flex flex-col gap-[7px]">
							<label htmlFor="ai-role" className="text-sm font-semibold text-ink">
								AI role
							</label>
							<input
								id="ai-role"
								type="text"
								value={aiRole}
								onChange={(event) => setAiRole(event.target.value)}
								className={inputClass}
							/>
						</div>
					</div>

					<div className="mt-5 flex flex-col gap-[7px]">
						<label htmlFor="goal" className="text-sm font-semibold text-ink">
							Goal
						</label>
						<textarea
							id="goal"
							rows={2}
							value={goal}
							onChange={(event) => setGoal(event.target.value)}
							className={`${inputClass} min-h-[72px] resize-y`}
						/>
					</div>

					<div className="mt-5 flex flex-col gap-2">
						<p className="text-sm font-semibold text-ink">Difficulty</p>
						<Segmented
							label="Difficulty"
							value={difficulty}
							onChange={(value) => setDifficulty(value as EnglishLevel)}
							options={DIFFICULTIES}
						/>
					</div>

					<div className="mt-5 flex flex-col gap-2">
						<p className="text-sm font-semibold text-ink">Duration</p>
						<Segmented
							label="Duration"
							value={duration}
							onChange={setDuration}
							options={DURATIONS.map((d) => ({ value: d, label: `${d} min` }))}
						/>
					</div>

					<div className="mt-5 flex flex-col gap-2">
						<p className="text-sm font-semibold text-ink">Target vocabulary</p>
						<div className="flex flex-wrap gap-2">
							{scenario.targetVocabulary.length > 0 ? (
								scenario.targetVocabulary.map((word) => (
									<span
										key={word}
										className="inline-flex min-h-[38px] items-center rounded-full border border-line bg-paper px-4 text-sm font-medium text-ink-2"
									>
										{word}
									</span>
								))
							) : (
								<p className="text-sm text-muted">None for this scenario.</p>
							)}
						</div>
						<p className="text-sm text-muted">
							The AI will weave these in naturally. No need to memorize them first.
						</p>
					</div>

					{!configured && (
						<div className="mt-6 border-t border-line-soft pt-6">
							<p className="text-sm font-semibold text-ink">Connect your AI provider</p>
							<p className="mt-1 text-sm text-muted">
								Pilih provider, masukkan API key untuk disimpan aman di akun (server-proxy).
								Key dipakai server saat chat — tidak pernah dipakai dari browser.
							</p>
							<div className="mt-4">
								{!user && !authLoading ? (
									<Button
										to={googleLoginUrl(`/practice/${scenarioId}/setup`)}
										variant="secondary"
										className="w-full"
									>
										Login dengan Google untuk menghubungkan key
									</Button>
								) : (
									<ProviderSetupForm
										compact
										initial={
											provider
												? {
														provider: provider.provider,
														model: provider.model,
													}
												: null
										}
										onSave={async (value) => {
											if (!user) return;
											const r = value.apiKey
												? await saveServerKey({
														provider: value.provider,
														apiKey: value.apiKey,
														model: value.model,
														...(value.baseURL ? { baseURL: value.baseURL } : {}),
													})
												: { ok: true };
											if (!r.ok) {
												// key invalid — jangan set configured
												return;
											}
											setProvider((prev) => ({
												level: prev?.level ?? difficulty,
												provider: value.provider,
												model: value.model,
												serverKey: true,
												mode: prev?.mode ?? mode,
											}));
											setConfigured(true);
										}}
									/>
								)}
							</div>
						</div>
					)}

					<Button
						onClick={start}
						disabled={!configured}
						size="lg"
						className="mt-6 w-full"
					>
						{configured ? "Start Conversation" : "Connect a provider to continue"}
					</Button>
					<p className="mt-3 text-center text-sm text-muted">
						<Link to={`/practice/${scenario.id}`} className="font-semibold text-accent transition hover:text-accent-dark">
							Skip setup and start directly
						</Link>
					</p>
				</div>
			</div>
		</AppShell>
	);
}
