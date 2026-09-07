import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/practice-setup";
import { AppShell } from "~/components/AppShell";
import { Button } from "~/components/Button";
import { Segmented } from "~/components/Segmented";
import { useAuth, fetchServerKeys } from "~/lib/auth";
import { getScenario, type EnglishLevel } from "~/data/scenarios";
import {
	getReadyTranscriptByScenario,
	type ReadyTranscript,
	type TranscriptTurn,
} from "~/data/transcripts";
import { isSpeechSupported } from "~/lib/speech-core";
import {
	clearDraft,
	getSetup,
	loadDraft,
	loadPrefs,
	saveDraft,
	setSetup,
	setupReady,
	type ConversationStyle,
	type Setup,
} from "~/lib/storage";
import { inputClass } from "~/lib/ui";
import {
	extractDocumentText,
	fileKindLabel,
	SUPPORTED_FILE_HINT,
	type ExtractResult,
} from "~/lib/document-extract";
import { applyPersonalizedTurns, personalizeIntervieweeTranscript } from "~/lib/personalize";

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

const FILE_ACCEPT =
	".txt,.text,.md,.markdown,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function extractionErrorMessage(result: ExtractResult): string {
	if (result.ok) return "";
	switch (result.error) {
		case "unsupported":
			return `We can't read that file type. ${SUPPORTED_FILE_HINT}.`;
		case "empty":
			return "That file has no readable text. Try one with written content.";
		case "encrypted":
			return "That PDF is password-protected. Remove the password and try again.";
		case "too-large":
			return "That file is larger than 5 MB. Try a shorter version.";
		default:
			return "We couldn't read that file. It may be damaged — try saving it as .txt or .md.";
	}
}

function TranscriptPreview({
	transcript,
	aiLabel,
	userLabel,
}: {
	transcript: { turns: TranscriptTurn[] };
	aiLabel: string;
	userLabel: string;
}) {
	return (
		<div className="max-h-[320px] overflow-y-auto rounded-lg border border-line-soft bg-surface/50 p-3">
			<ol className="flex flex-col gap-2">
				{transcript.turns.map((turn, index) => {
					const isUser = turn.role === "user";
					const number = Math.floor(index / 2) + 1;
					return (
						<li key={`${turn.role}-${index}`} className={`chat ${isUser ? "chat-end" : "chat-start"}`}>
							<div className={`chat-header text-xs font-semibold ${isUser ? "text-accent" : "text-muted"}`}>
								{isUser ? userLabel : aiLabel}
								{isUser ? ` · line ${number}` : ""}
							</div>
							<div
								className={`chat-bubble max-w-[92%] text-sm leading-[1.5] ${
									isUser
										? "bg-accent text-accent-content"
										: "border border-line-soft bg-paper text-ink"
								}`}
							>
								{turn.text}
							</div>
						</li>
					);
				})}
			</ol>
		</div>
	);
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
	const [providerLoading, setProviderLoading] = useState(true);

	const baseTranscript = scenario ? getReadyTranscriptByScenario(scenario.id) : undefined;
	const readyEnabled = Boolean(baseTranscript);

	// Conversation style + optional personalization (ready mode only).
	const [style, setStyle] = useState<ConversationStyle>("spontaneous");
	const [personalized, setPersonalized] = useState<string[] | null>(null);
	const [sourceFile, setSourceFile] = useState<File | null>(null);
	const [sourceFileName, setSourceFileName] = useState<string | null>(null);
	const [personalizing, setPersonalizing] = useState<string | null>(null);
	const [fileError, setFileError] = useState<string | null>(null);
	const [generatedAt, setGeneratedAt] = useState<string | null>(null);

	useEffect(() => {
		if (!scenario) navigate("/practice", { replace: true });
	}, [scenario, navigate]);

	// Reset ready-specific state, then restore a matching draft for this
	// scenario (roles, duration, mode, style, personalization). Runs whenever
	// the scenario id changes, including the first mount.
	useEffect(() => {
		if (!scenario) return;
		const draft = loadDraft();
		const matching = draft?.scenarioId === scenario.id;

		setUserRole(matching && draft.userRole ? draft.userRole : scenario.userRole);
		setAiRole(matching && draft.aiRole ? draft.aiRole : scenario.aiRole);
		setGoal(matching && draft.objective ? draft.objective : scenario.objective);
		setDuration(matching ? nearestDuration(draft.durationMin) : nearestDuration(scenario.durationMin));
		if (matching && draft.mode) setMode(draft.mode);

		const draftReady = matching && draft.conversationStyle === "ready" && Boolean(baseTranscript);
		setStyle(draftReady ? "ready" : "spontaneous");
		setPersonalized(null);
		setSourceFile(null);
		setSourceFileName(null);
		setFileError(null);
		setGeneratedAt(null);
		if (draftReady) {
			const userTexts = (draft.readyTurns ?? [])
				.filter((turn) => turn.role === "user")
				.map((turn) => turn.text);
			if (userTexts.length > 0) setPersonalized(userTexts);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [scenario?.id]);

	// Tarik key server saat login — agar tak perlu input key lagi utk mulai practice.
	useEffect(() => {
		if (authLoading) {
			setProviderLoading(true);
			return;
		}

		let cancelled = false;
		function clearUnavailableSetup() {
			setProvider(null);
			setConfigured(false);
			setSetup(null);
		}

		if (!user) {
			clearUnavailableSetup();
			setProviderLoading(false);
			return () => {
				cancelled = true;
			};
		}

		setProviderLoading(true);
		clearUnavailableSetup();
		async function loadServerSetup() {
			try {
				const keys = await fetchServerKeys();
				if (cancelled) return;
				const def = keys?.find((key) => key.isDefault) ?? keys?.[0];
				if (!def) return;

				setProvider({
					level: difficulty,
					provider: def.provider as Setup["provider"],
					model: def.model,
					serverKey: true,
					mode,
				});
				setConfigured(true);
			} finally {
				if (!cancelled) setProviderLoading(false);
			}
		}

		void loadServerSetup();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [authLoading, user]);

	const effectiveTurns = useMemo<TranscriptTurn[] | null>(() => {
		if (!baseTranscript) return null;
		if (personalized) return applyPersonalizedTurns(baseTranscript, personalized);
		return baseTranscript.turns;
	}, [baseTranscript, personalized]);

	const effectiveTranscript: ReadyTranscript | null = useMemo(() => {
		if (!baseTranscript || !effectiveTurns) return null;
		return { ...baseTranscript, turns: effectiveTurns };
	}, [baseTranscript, effectiveTurns]);

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
			conversationStyle: style,
			...(style === "ready" && effectiveTurns ? { readyTurns: effectiveTurns } : {}),
		});
		navigate(`/practice/${scenario.id}`);
	}

	function chooseFile(file: File | null) {
		setSourceFile(file);
		setFileError(null);
		setGeneratedAt(null);
		setSourceFileName(null);
		// Any document change (or removal) resets personalization until the
		// user generates again, so the transcript always matches the file.
		setPersonalized(null);
	}

	async function generateFromFile() {
		if (!sourceFile) return;
		const base = provider ?? existing;
		if (!setupReady(base) || !base || !baseTranscript) return;
		if (personalizing) return;

		setFileError(null);
		setPersonalizing(`Reading ${sourceFile.name}…`);
		const extracted = await extractDocumentText(sourceFile);
		if (!extracted.ok) {
			setPersonalizing(null);
			setFileError(extractionErrorMessage(extracted));
			return;
		}

		setPersonalizing("Writing your interviewee lines…");
		const outcome = await personalizeIntervieweeTranscript(
			{ provider: base.provider, model: base.model },
			baseTranscript,
			{
				documentName: sourceFile.name,
				documentText: extracted.text,
				level: difficulty,
			},
		);
		setPersonalizing(null);
		if (outcome.ok) {
			setPersonalized(outcome.userTurns);
			setSourceFileName(sourceFile.name);
			setGeneratedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
		} else {
			setFileError(outcome.reason);
		}
	}

	const userTurnCount = baseTranscript
		? baseTranscript.turns.filter((t) => t.role === "user").length
		: 0;
	const userLabel = scenario.userRole || "You";
	const aiLabel = scenario.aiRole || "Other person";

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
					<p className="mt-3 text-muted">
						{readyEnabled
							? "Choose how the conversation runs, then jump in."
							: "Two quick choices and you’re in."}
					</p>
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

					{readyEnabled && (
						<>
							<div className="mt-6 border-t border-line-soft pt-5">
								<div className="flex flex-col gap-3">
									<div>
										<p className="text-sm font-semibold text-ink">Conversation style</p>
										<p className="mt-0.5 text-sm text-muted">
											How the {aiLabel.toLowerCase()} talks with you.
										</p>
									</div>

									<label
										className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-paper ${
											style === "spontaneous"
												? "border-accent bg-accent/5"
												: "border-line bg-paper hover:bg-surface"
										}`}
									>
										<input
											type="radio"
											name="conversation-style"
											className="radio radio-accent mt-0.5 flex-none"
											checked={style === "spontaneous"}
											onChange={() => setStyle("spontaneous")}
										/>
										<span>
											<span className="block text-sm font-semibold text-ink">Spontaneous</span>
											<span className="mt-1 block text-sm leading-[1.5] text-muted">
												The {aiLabel.toLowerCase()} improvises in character and follows wherever
												your answers go.
											</span>
										</span>
									</label>

									<label
										className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-paper ${
											style === "ready"
												? "border-accent bg-accent/5"
												: "border-line bg-paper hover:bg-surface"
										}`}
									>
										<input
											type="radio"
											name="conversation-style"
											className="radio radio-accent mt-0.5 flex-none"
											checked={style === "ready"}
											onChange={() => setStyle("ready")}
										/>
										<span>
											<span className="block text-sm font-semibold text-ink">Ready transcript</span>
											<span className="mt-1 block text-sm leading-[1.5] text-muted">
												The {aiLabel.toLowerCase()} speaks only from a fixed transcript — no
												improvisation. {baseTranscript
													? `${baseTranscript.turns.length} lines, ${userTurnCount} for you.`
													: ""}
											</span>
										</span>
									</label>
								</div>
							</div>

							{style === "ready" && effectiveTranscript && (
								<div className="mt-5 border-t border-line-soft pt-5">
									<div className="flex flex-wrap items-baseline justify-between gap-2">
										<div>
											<h2 className="text-sm font-semibold text-ink">Ready transcript</h2>
											<p className="mt-0.5 max-w-[460px] text-sm text-muted">
												{effectiveTranscript.description}
											</p>
										</div>
										<span className="badge badge-outline text-xs font-medium text-muted">
											You reply in your own words
										</span>
									</div>

									<p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-meta">
										Preview
									</p>
									<div className="mt-2">
										<TranscriptPreview
											transcript={effectiveTranscript}
											aiLabel={aiLabel}
											userLabel={userLabel}
										/>
									</div>
									<p className="mt-3 text-sm leading-[1.5] text-muted">
										Your interviewee lines are speaking cues, not scripts to recite. Read each cue,
										then answer in your own words — that’s what gets scored.
									</p>
								</div>
							)}

							{style === "ready" && baseTranscript && (
								<div className="mt-5 border-t border-line-soft pt-5">
									<div className="flex flex-wrap items-baseline justify-between gap-2">
										<div>
											<h2 className="text-sm font-semibold text-ink">
												Base it on your own document
											</h2>
											<p className="mt-0.5 max-w-[480px] text-sm text-muted">
												Upload a CV, a PRD, or meeting notes, and your interviewee cues are
												rewritten around the real facts in it.
											</p>
										</div>
										<span className="badge badge-soft text-xs font-medium text-muted">Optional</span>
									</div>

									<div className="mt-3 flex flex-col gap-3">
										<input
											id="doc-upload"
											type="file"
											accept={FILE_ACCEPT}
											className="file-input file-input-md w-full border-line bg-paper text-sm text-ink focus:border-accent"
											aria-label="Upload a document to personalize your lines"
											onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
										/>
										{sourceFile && (
											<div className="flex flex-wrap items-center gap-2 rounded-lg border border-line-soft bg-surface/60 px-3 py-2">
												<span className="badge badge-outline badge-sm text-xs font-semibold text-ink-2">
													{fileKindLabel(sourceFile.name)}
												</span>
												<span className="min-w-0 flex-1 truncate text-sm text-ink-2">
													{sourceFile.name}
												</span>
											</div>
										)}

										{!personalizing && fileError && (
											<div role="alert" className="alert alert-error alert-soft text-sm">
												<span>{fileError}</span>
											</div>
										)}

										{personalizing && (
											<p className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
												<span className="loading loading-spinner loading-sm text-accent" aria-hidden />
												{personalizing}
											</p>
										)}

										{generatedAt && (
											<div role="status" className="alert alert-success alert-soft text-sm">
												<span>
													Your interviewee cues now use details from{" "}
													<strong className="font-semibold text-ink">{sourceFileName}</strong>.
												</span>
											</div>
										)}

										<div className="flex flex-wrap items-center gap-3">
											<Button
												onClick={() => void generateFromFile()}
												disabled={!sourceFile || !configured || Boolean(personalizing) || providerLoading}
												size="md"
												variant={generatedAt ? "secondary" : "primary"}
											>
												{generatedAt
													? "Regenerate from this document"
													: "Generate my interviewee lines"}
											</Button>
											{sourceFile && (
												<button
													type="button"
													onClick={() => chooseFile(null)}
													className="text-sm font-semibold text-muted underline-offset-2 transition hover:text-ink hover:underline focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper focus:outline-none"
												>
													{generatedAt ? "Remove and use the default transcript" : "Remove"}
												</button>
											)}
										</div>
										<p className="text-xs leading-[1.5] text-meta">
											Your file stays in this browser — only extracted text goes to your AI
											provider to write the cues, and nothing is stored.
										</p>
									</div>
								</div>
							)}
						</>
					)}

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
							{style === "ready"
								? "Use these in your replies — we’ll track them live during practice."
								: "The AI will weave these in naturally. No need to memorize them first."}
						</p>
					</div>

					<Button
						onClick={start}
						disabled={providerLoading || !configured}
						size="lg"
						className="mt-6 w-full"
					>
						{providerLoading
							? "Checking provider connection…"
							: configured
								? "Start conversation"
								: "Connect a provider to continue"}
					</Button>
					{!configured && !providerLoading && (
						<Button to="/settings" variant="secondary" size="lg" className="mt-3 w-full">
							Open settings
						</Button>
					)}
					<p className="mt-3 text-center text-sm text-muted">
						<Link
							to={`/practice/${scenario.id}`}
							className="font-semibold text-accent transition hover:text-accent-dark"
						>
							Skip setup and start directly
						</Link>
					</p>
				</div>
			</div>
		</AppShell>
	);
}
