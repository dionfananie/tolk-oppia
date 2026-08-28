import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/practice-setup";
import { AppShell } from "~/components/AppShell";
import { Segmented } from "~/components/Segmented";
import { ProviderSetupForm } from "~/components/ProviderSetupForm";
import { getScenario, type EnglishLevel } from "~/data/scenarios";
import {
	clearDraft,
	getSetup,
	loadDraft,
	loadPrefs,
	saveDraft,
	setSetup,
	type Setup,
} from "~/lib/storage";

export function meta({ params }: Route.MetaArgs) {
	const scenario = getScenario(params.scenarioId ?? "");
	return [{ title: scenario ? `${scenario.title} · Practice setup` : "Practice setup · TOLK" }];
}

const FIELD_INPUT =
	"w-full rounded-[4px] border border-meta bg-paper px-3.5 py-3 text-base text-ink transition hover:border-ink-2 focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,#3e6ae1_30%,transparent)] focus:outline-none";

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
	const [userRole, setUserRole] = useState(scenario?.userRole ?? "");
	const [aiRole, setAiRole] = useState(scenario?.aiRole ?? "");
	const [goal, setGoal] = useState(scenario?.objective ?? "");
	const [difficulty, setDifficulty] = useState<EnglishLevel>(
		scenario?.difficulty ?? "intermediate",
	);
	const [duration, setDuration] = useState(nearestDuration(scenario?.durationMin ?? 10));
	const [mode, setMode] = useState<"voice" | "text">(() => {
		if (existing?.mode) return existing.mode;
		return loadPrefs()?.mode ?? "text";
	});
	const [provider, setProvider] = useState<Setup | null>(existing);
	const [configured, setConfigured] = useState(Boolean(existing?.apiKey));

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

	if (!scenario) return null;

	function start() {
		if (!scenario) return;
		const base = provider ?? existing;
		if (!base?.apiKey) return;
		const setup: Setup = {
			level: difficulty,
			provider: base.provider,
			model: base.model,
			apiKey: base.apiKey,
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

				<div className="mt-6 rounded-xl border border-line bg-paper p-6">
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
								className={FIELD_INPUT}
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
								className={FIELD_INPUT}
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
							className={`${FIELD_INPUT} min-h-[72px] resize-y`}
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
						<p className="text-sm font-semibold text-ink">Speech</p>
						<Segmented
							label="Speech mode"
							value={mode}
							onChange={(value) => setMode(value as "voice" | "text")}
							options={[
								{ value: "voice", label: "Voice" },
								{ value: "text", label: "Text" },
							]}
						/>
						<p className="text-sm text-muted">
							{mode === "voice"
								? "Voice capture is on the roadmap. For now, choosing Voice keeps the push-to-talk UI and falls back to typing."
								: "Type your responses in the conversation."}
						</p>
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
								Add your DeepSeek or GLM API key to start the conversation. The key stays in
								this browser session.
							</p>
							<div className="mt-4">
								<ProviderSetupForm
									compact
									initial={provider}
									onSave={(setup) => {
										setProvider(setup);
										setConfigured(true);
									}}
								/>
							</div>
						</div>
					)}

					<button
						type="button"
						onClick={start}
						disabled={!configured}
						className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent-dark disabled:pointer-events-none disabled:opacity-40"
					>
						{configured ? "Start Conversation" : "Connect a provider to continue"}
					</button>
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
