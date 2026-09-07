import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { Route } from "./+types/practice";
import { getScenario } from "~/data/scenarios";
import { getReadyTranscriptByScenario, matchTargetPhrases, type TranscriptTurn } from "~/data/transcripts";
import { fetchServerKeys, useAuth } from "~/lib/auth";
import type { ChatMessage } from "~/lib/providers";
import { openConversation, respond } from "~/lib/engine";
import { generateFeedback, overallScore } from "~/lib/feedback";
import {
	clearDraft,
	getSetup,
	loadDraft,
	loadPrefs,
	loadSettings,
	saveSession,
	setSetup,
	setupFromPrefs,
	setupReady,
	type ConversationStyle,
	type Session,
	type SessionDraft,
	type Setup,
} from "~/lib/storage";
import { formatClock } from "~/lib/format";
import { rateFromSetting, useSTT, useTTS } from "~/lib/speech";
import { Orb, type OrbState } from "~/components/Orb";
import { Switch } from "~/components/Switch";
import { TypingIndicator } from "~/components/ChatBubble";
import { IconArrowLeft, IconMic, IconReplay } from "~/components/icons";

export function meta({ params }: Route.MetaArgs) {
	const scenario = getScenario(params.scenarioId ?? "");
	return [{ title: scenario ? `${scenario.title} · Practice` : "Practice · TOLK" }];
}

const STATE_LABELS: Record<OrbState, string> = {
	idle: "IDLE",
	listening: "LISTENING",
	processing: "PROCESSING",
	speaking: "AI SPEAKING",
	error: "ERROR",
};

/** How long the interviewee's finalized words stay on screen before the next
 *  speaker's caption takes over. */
const USER_CAPTION_HOLD_MS = 3200;

type CaptionRole = "neutral" | "assistant" | "user";

export default function Practice() {
	const { scenarioId } = useParams();
	const navigate = useNavigate();
	const scenario = scenarioId ? getScenario(scenarioId) : undefined;
	const { user, loading: authLoading } = useAuth();

	const [setup, setSetupState] = useState<Setup | null>(() => getSetup());
	const [providerLoading, setProviderLoading] = useState(true);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [draft, setDraft] = useState<SessionDraft | null>(null);
	const [mode, setMode] = useState<"voice" | "text">("text");
	const [input, setInput] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showCaptions, setShowCaptions] = useState(false);
	const [orbState, setOrbState] = useState<OrbState>("idle");
	const [listening, setListening] = useState(false);
	const [seconds, setSeconds] = useState(0);
	const [started, setStarted] = useState(false);
	const [captionText, setCaptionText] = useState("Ready when you are.");
	const [captionRole, setCaptionRole] = useState<CaptionRole>("neutral");
	const [conversationStyle, setConversationStyle] = useState<ConversationStyle>("spontaneous");
	const [cueText, setCueText] = useState<string | null>(null);
	const [transcriptComplete, setTranscriptComplete] = useState(false);

	const startedAtRef = useRef<string | null>(null);
	const openedRef = useRef(false);
	const busyRef = useRef(false);
	const listeningRef = useRef(false);
	const startingToListenRef = useRef(false);
	const orbRef = useRef<OrbState>("idle");
	const transcriptRef = useRef<HTMLDivElement | null>(null);

	// Ready-transcript runtime: the fixed turns, the index of the last
	// delivered assistant turn, and caption hold timers.
	const styleRef = useRef<ConversationStyle>("spontaneous");
	const turnsRef = useRef<TranscriptTurn[] | null>(null);
	const assistantIdxRef = useRef(-2);
	const completeRef = useRef(false);
	const holdTimerRef = useRef<number | null>(null);
	const dwellUntilRef = useRef(0);
	const pendingCaptionRef = useRef<{ text: string; role: CaptionRole } | null>(null);

	const useDraft = Boolean(draft && draft.scenarioId === scenario?.id && draft.userRole);
	const effectiveScenario =
		useDraft && draft
			? {
				...scenario!,
				userRole: draft.userRole || scenario!.userRole,
				aiRole: draft.aiRole || scenario!.aiRole,
				objective: draft.objective || scenario!.objective,
			}
			: scenario;

	const stt = useSTT();
	const tts = useTTS();
	const voiceSupported = stt.controller.isSupported;

	useEffect(() => {
		if (!scenario) navigate("/", { replace: true });
	}, [scenario, navigate]);

	useEffect(() => {
		if (!getSetup()) setSetupState(setupFromPrefs());
		const currentDraft = loadDraft();
		setDraft(currentDraft);
		setMode(
			currentDraft?.mode ??
			getSetup()?.mode ??
			loadPrefs()?.mode ??
			(voiceSupported ? "voice" : "text"),
		);
		if (currentDraft?.conversationStyle === "ready") {
			setConversationStyle("ready");
		}
	}, []);

	useEffect(() => {
		let cancelled = false;

		function useUnconfiguredFallback() {
			const fallback = setupFromPrefs();
			setSetup(fallback);
			setSetupState(fallback);
		}

		if (authLoading) {
			setProviderLoading(true);
			return () => {
				cancelled = true;
			};
		}

		if (!user) {
			useUnconfiguredFallback();
			setProviderLoading(false);
			return () => {
				cancelled = true;
			};
		}

		setProviderLoading(true);
		async function loadServerSetup() {
			try {
				const keys = await fetchServerKeys();
				if (cancelled) return;
				const defaultKey = keys?.find((key) => key.isDefault) ?? keys?.[0];
				if (!defaultKey) {
					useUnconfiguredFallback();
					return;
				}

				const current = getSetup() ?? setupFromPrefs();
				const currentDraft = loadDraft();
				const next: Setup = {
					level: current?.level ?? "intermediate",
					provider: defaultKey.provider as Setup["provider"],
					model: defaultKey.model,
					serverKey: true,
					mode:
						current?.mode ??
						currentDraft?.mode ??
						loadPrefs()?.mode ??
						(voiceSupported ? "voice" : "text"),
				};
				setSetup(next);
				setSetupState(next);
				setMode(next.mode ?? "text");
			} catch {
				if (!cancelled) useUnconfiguredFallback();
			} finally {
				if (!cancelled) setProviderLoading(false);
			}
		}

		void loadServerSetup();
		return () => {
			cancelled = true;
		};
	}, [authLoading, user]);

	useEffect(() => {
		orbRef.current = orbState;
	}, [orbState]);

	// Keep the ref used inside callbacks in sync with the UI state so a mic tap
	// before `begin` runs can never send through the wrong conversation style.
	useEffect(() => {
		styleRef.current = conversationStyle;
	}, [conversationStyle]);

	function autoSpeak(text: string) {
		if (!tts.controller.isSupported) return;
		const settings = loadSettings();
		void tts.controller.speak(text, {
			rate: rateFromSetting(settings.speechRate),
		});
	}

	useEffect(() => {
		if (tts.controller.isSpeaking) {
			setOrbState("speaking");
			return;
		}
		if (orbRef.current === "speaking") {
			setOrbState(listeningRef.current ? "listening" : "idle");
		}
	}, [tts.controller.isSpeaking]);

	function clearHoldTimers() {
		if (holdTimerRef.current !== null) {
			window.clearTimeout(holdTimerRef.current);
			holdTimerRef.current = null;
		}
	}

	useEffect(() => () => clearHoldTimers(), []);

	/**
	 * Show a caption while honoring a minimum dwell for the interviewee's own
	 * words: once the user has spoken, an incoming interviewer caption waits
	 * until the dwell window closes instead of instantly replacing the user's.
	 */
	function showCaption(text: string, role: CaptionRole) {
		const now = Date.now();
		const remaining = dwellUntilRef.current - now;
		if ((role === "assistant" || role === "neutral") && remaining > 0) {
			pendingCaptionRef.current = { text, role };
			clearHoldTimers();
			holdTimerRef.current = window.setTimeout(
				() => {
					holdTimerRef.current = null;
					const pending = pendingCaptionRef.current;
					if (pending) {
						pendingCaptionRef.current = null;
						setCaptionText(pending.text);
						setCaptionRole(pending.role);
					}
				},
				remaining + 40,
			);
			return;
		}
		pendingCaptionRef.current = null;
		if (role === "user") dwellUntilRef.current = now + USER_CAPTION_HOLD_MS;
		setCaptionText(text);
		setCaptionRole(role);
	}

	function readyTurnsFor(draftTurns: TranscriptTurn[] | undefined): TranscriptTurn[] | null {
		if (draftTurns && draftTurns.length > 0) return draftTurns;
		if (!scenario) return null;
		const builtIn = getReadyTranscriptByScenario(scenario.id);
		return builtIn ? builtIn.turns : null;
	}

	/** Deliver one scripted assistant turn, then expose the next user cue. */
	function deliverReadyTurn(index: number): boolean {
		const turns = turnsRef.current;
		if (!turns) return false;
		const turn = turns[index];
		if (!turn || turn.role !== "assistant") return false;

		assistantIdxRef.current = index;
		const message: ChatMessage = { role: "assistant", content: turn.text };
		setMessages((previous) => [...previous, message]);
		showCaption(turn.text, "assistant");
		if (loadSettings().autoPlay) autoSpeak(turn.text);

		const cue = turns[index + 1];
		if (cue && cue.role === "user") {
			setCueText(cue.text);
		} else {
			// No follow-up user turn: the transcript is complete.
			markFinishedState();
		}
		return true;
	}

	const begin = useCallback(
		async (config: Setup) => {
			if (!scenario || !effectiveScenario || openedRef.current) return;
			openedRef.current = true;
			startedAtRef.current = new Date().toISOString();
			setStarted(true);

			// Capture the ready transcript BEFORE clearing the draft below.
			const currentDraft = loadDraft() ?? draft;
			const draftMatches = currentDraft?.scenarioId === scenario.id;
			const draftTurns = draftMatches ? currentDraft?.readyTurns : undefined;
			const readyTurns = readyTurnsFor(draftTurns);

			clearDraft();
			setError(null);
			setTranscriptComplete(false);
			completeRef.current = false;

			const isReady = Boolean(readyTurns);
			styleRef.current = isReady ? "ready" : "spontaneous";
			setConversationStyle(styleRef.current);
			turnsRef.current = readyTurns;
			assistantIdxRef.current = -2;

			setBusy(true);
			setOrbState("processing");
			if (isReady) {
				setCaptionText("Your transcript is starting…");
				setCaptionRole("neutral");
				setCueText(null);
				// Small delay so the UI settles before the first line.
				window.setTimeout(() => {
					setBusy(false);
					const delivered = deliverReadyTurn(0);
					if (!delivered) {
						openedRef.current = false;
						setOrbState("error");
						setError("This ready transcript is empty. Go back to setup and pick another.");
						setTranscriptComplete(true);
					}
				}, 60);
				return;
			}

			setCaptionText("Your coach is saying hello…");
			try {
				const opening = await openConversation(
					config,
					effectiveScenario,
					config.level,
					loadSettings().promptStyle,
				);
				setMessages([opening]);
				showCaption(opening.content, "assistant");
				if (loadSettings().autoPlay) autoSpeak(opening.content);
			} catch (cause) {
				openedRef.current = false;
				setOrbState("error");
				setError(cause instanceof Error ? cause.message : "Failed to start the conversation.");
			} finally {
				setBusy(false);
				setOrbState((current) => (current === "error" ? "error" : "idle"));
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[scenario, effectiveScenario],
	);

	useEffect(() => {
		if (!providerLoading && setup && setupReady(setup) && messages.length === 0 && !openedRef.current && !busy) {
			void begin(setup);
		}
	}, [providerLoading, setup, messages, begin, busy]);

	useEffect(() => {
		if (!started) return;
		const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
		return () => window.clearInterval(id);
	}, [started]);

	useEffect(() => {
		transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
	}, [messages, busy, showCaptions]);

	function changeMode(next: "voice" | "text") {
		setMode(next);
		const base = setup ?? setupFromPrefs();
		if (base) setSetup({ ...base, mode: next });
	}

	function markFinishedState() {
		completeRef.current = true;
		setTranscriptComplete(true);
		setCueText(null);
		setBusy(false);
		busyRef.current = false;
		setOrbState("idle");
	}

	/** Ready mode: record the user's answer, hold it on screen, then advance. */
	function readyReply(text: string) {
		const turns = turnsRef.current;
		if (!turns || completeRef.current || busyRef.current) return;
		const history: ChatMessage[] = [...messages, { role: "user", content: text }];
		setMessages(history);
		setError(null);
		setBusy(true);
		busyRef.current = true;
		setOrbState("processing");
		showCaption(text, "user");

		clearHoldTimers();
		holdTimerRef.current = window.setTimeout(() => {
			holdTimerRef.current = null;
			busyRef.current = false;
			const next = assistantIdxRef.current + 2;
			const delivered = deliverReadyTurn(next);
			if (!delivered) {
				markFinishedState();
				showCaption(
					turns.length > 0 && assistantIdxRef.current >= turns.length - 2
						? "You finished the ready transcript — nice work."
						: "End of transcript.",
					"neutral",
				);
				return;
			}
			setBusy(false);
			setOrbState("idle");
		}, USER_CAPTION_HOLD_MS);
	}

	async function send(textOverride?: string) {
		const text = (textOverride ?? input).trim();
		if (!text || !setupReady(setup) || !setup || !scenario || !effectiveScenario || busyRef.current) return;
		if (completeRef.current) return;

		if (styleRef.current === "ready") {
			readyReply(text);
			setInput("");
			return;
		}

		const history: ChatMessage[] = [...messages, { role: "user", content: text }];
		setMessages(history);
		setInput("");
		setBusy(true);
		busyRef.current = true;
		setOrbState("processing");
		showCaption(text, "user");
		setError(null);
		try {
			const reply = await respond(
				setup,
				effectiveScenario,
				setup.level,
				history,
				loadSettings().promptStyle,
			);
			setMessages([...history, { role: "assistant", content: reply }]);
			showCaption(reply, "assistant");
			setOrbState("idle");
			if (loadSettings().autoPlay) autoSpeak(reply);
		} catch (cause) {
			setMessages(messages);
			setOrbState("error");
			setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
		} finally {
			setBusy(false);
			busyRef.current = false;
		}
	}

	async function startListening() {
		if (busyRef.current || listeningRef.current || startingToListenRef.current) return;
		tts.controller.cancel();
		startingToListenRef.current = true;
		listeningRef.current = true;
		setListening(true);
		setOrbState("listening");
		setCaptionText("Starting microphone…");
		setCaptionRole("neutral");
		try {
			await stt.controller.start({
				onFinal: (text) => {
					if (!text) return;
					void send(text);
				},
			});
			setCaptionText("Listening… tap to stop");
			setCaptionRole("neutral");
		} catch (cause) {
			listeningRef.current = false;
			setListening(false);
			setOrbState("error");
			setCaptionText(cause instanceof Error ? cause.message : "Could not start the microphone.");
			setCaptionRole("neutral");
		} finally {
			startingToListenRef.current = false;
		}
	}

	function stopListening() {
		stt.controller.stop();
	}

	function toggleClickToSpeak() {
		if (busyRef.current) return;
		if (listeningRef.current) {
			stopListening();
			return;
		}
		void startListening();
	}

	// Sinkronkan state `listening` lokal dengan isListening provider aktif (auto-stop Web Speech).
	useEffect(() => {
		if (stt.controller.isListening) {
			listeningRef.current = true;
			return;
		}
		if (startingToListenRef.current) return;
		if (listeningRef.current) {
			listeningRef.current = false;
			setListening(false);
			if (orbRef.current === "listening") setOrbState("idle");
		}
	}, [stt.controller.isListening]);

	// Tampilkan interim transcript live sebagai caption saat mendengarkan.
	useEffect(() => {
		if (listeningRef.current && stt.controller.interimTranscript) {
			pendingCaptionRef.current = null;
			setCaptionText(stt.controller.interimTranscript);
			setCaptionRole("user");
		}
	}, [stt.controller.interimTranscript]);

	// Error dari provider STT (mis. mik tidak diizinkan) → kembali idle dengan pesan.
	useEffect(() => {
		if (!stt.controller.error) return;
		listeningRef.current = false;
		setListening(false);
		if (orbRef.current === "listening") setOrbState("idle");
		setCaptionText(stt.controller.error);
		setCaptionRole("neutral");
	}, [stt.controller.error]);

	async function finish() {
		if (!setup || !scenario || !effectiveScenario || messages.length === 0 || busy) return;
		tts.controller.cancel();
		clearHoldTimers();
		setBusy(true);
		setError(null);
		const endedAt = new Date().toISOString();
		const session: Session = {
			id: crypto.randomUUID(),
			scenarioId: scenario.id,
			level: setup.level,
			provider: setup.provider,
			model: setup.model,
			startedAt: startedAtRef.current ?? endedAt,
			endedAt,
			messages,
			score: 0,
			feedback: null,
		};
		try {
			const feedback = await generateFeedback(setup, effectiveScenario, setup.level, messages);
			session.feedback = feedback;
			session.score = overallScore(feedback);
		} catch (cause) {
			const message =
				cause instanceof Error
					? cause.message
					: "Could not generate feedback. Your session was saved anyway.";
			session.feedbackError = message;
			setError(message);
		}
		saveSession(session);
		setBusy(false);
		navigate(`/complete/${session.id}`);
	}

	function replayLast() {
		const last = [...messages].reverse().find((m) => m.role === "assistant");
		if (!last) return;
		showCaption(last.content, "assistant");
		autoSpeak(last.content);
	}

	// ── Vocabulary tracking (from the user's actual spoken/submitted words) ──
	const targetVocabulary = effectiveScenario?.targetVocabulary ?? [];
	const usedTargets = useMemo(() => {
		if (targetVocabulary.length === 0) return [];
		const userSpeech = messages
			.filter((m) => m.role === "user")
			.map((m) => m.content)
			.join(" ");
		return matchTargetPhrases(userSpeech, targetVocabulary);
	}, [messages, targetVocabulary]);

	if (!scenario || !effectiveScenario) {
		return null;
	}

	const aiLabel = effectiveScenario.aiRole;
	const userLabel = effectiveScenario.userRole || "You";
	const hasConversation = messages.length > 0;
	const vocabTotal = targetVocabulary.length;
	const vocabUsed = usedTargets.length;
	const readyLive = styleRef.current === "ready";
	const canSpeak = !readyLive || (hasConversation && !transcriptComplete);

	return (
		<div className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
			<header className="flex flex-none items-center gap-4 border-b border-line-soft px-4 py-[14px] sm:px-6">
				<button
					type="button"
					onClick={() => navigate(`/practice/${scenario.id}/setup`)}
					aria-label="Back to setup"
					className="grid size-[44px] flex-none place-items-center rounded-lg border border-line bg-paper text-ink-2 transition-colors hover:bg-surface hover:text-ink focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper focus:outline-none"
				>
					<IconArrowLeft />
				</button>
				<div className="min-w-0 flex-1">
					<p className="truncate font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">
						{scenario.title}
					</p>
					<p className="truncate text-[13px] text-muted">
						{conversationStyle === "ready"
							? `${userLabel} · ${aiLabel} · ready transcript`
							: `You · ${scenario.userRole}`}
					</p>
				</div>
				<span className="hidden font-mono text-sm font-semibold text-ink-2 sm:block">
					{formatClock(seconds)}
				</span>
				<div className="hidden sm:block">
					<Switch checked={showCaptions} onChange={setShowCaptions} label="Captions" id="captions-toggle" />
				</div>
				<button
					type="button"
					onClick={replayLast}
					disabled={!hasConversation}
					aria-label="Replay last AI response"
					className="grid size-[44px] flex-none place-items-center rounded-lg border border-line bg-paper text-ink-2 transition-colors hover:bg-surface hover:text-ink focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper focus:outline-none disabled:pointer-events-none disabled:opacity-40"
				>
					<IconReplay />
				</button>
				<button
					type="button"
					onClick={() => void finish()}
					disabled={busy || !hasConversation}
					className="inline-flex min-h-[38px] items-center rounded-lg px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-40 focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper focus:outline-none"
				>
					Finish
				</button>
			</header>

			{/* Live target-vocabulary progress */}
			{vocabTotal > 0 && (
				<section
					aria-label="Target vocabulary progress"
					className="flex flex-none items-center gap-3 overflow-x-auto border-b border-line-soft bg-surface/40 px-4 py-2 sm:px-6"
				>
					<span className="flex-none font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
						Target words
					</span>
					<ul className="flex flex-none items-center gap-1.5">
						{targetVocabulary.map((word) => {
							const used = usedTargets.includes(word);
							return (
								<li key={word}>
									<span
										className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
											used
												? "border-accent bg-accent text-accent-content"
												: "border-line bg-paper text-ink-2"
										}`}
									>
										<span aria-hidden="true">{used ? "✓" : ""}</span>
										{word}
									</span>
								</li>
							);
						})}
					</ul>
					<span
						className="ms-auto flex-none font-mono text-xs font-semibold tabular-nums text-ink-2"
						aria-label={`${vocabUsed} of ${vocabTotal} target words used`}
					>
						{vocabUsed}/{vocabTotal}
					</span>
				</section>
			)}

			{providerLoading ? (
				<main className="flex flex-1 items-center justify-center px-4 pb-[10vh]" aria-live="polite">
					<p className="text-sm text-muted">Checking provider connection…</p>
				</main>
			) : (
				<div className="flex min-h-0 flex-1 flex-col bg-surface/40">
					<div className="mx-auto flex w-full max-w-[720px] min-h-0 flex-1 flex-col px-4 sm:px-6">
						<section
							className={`flex flex-col items-center ${hasConversation ? "flex-none pt-4" : "min-h-0 flex-1 overflow-y-auto py-6"
								}`}
						>
							<div className="my-auto flex w-full max-w-[520px] flex-col items-center rounded-[2rem] px-6 py-6 sm:px-10 sm:py-8">
								<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted" aria-live="polite">
									{STATE_LABELS[orbState]}
								</p>
								<div className="mt-5 grid place-items-center">
									<Orb
										name={aiLabel}
										sub={conversationStyle === "ready" ? "Your transcript partner" : "Your coach"}
										state={orbState}
										className={
											hasConversation
												? "size-[clamp(104px,14vw,124px)]"
												: "size-[clamp(140px,20vw,168px)]"
										}
									/>
								</div>
								<div className="mt-5 max-w-[480px] text-center" aria-live="polite">
									<p
										className={`font-mono text-xs font-semibold uppercase tracking-[0.14em] ${
											captionRole === "user" ? "text-ink" : "text-muted"
										}`}
									>
										{captionRole === "user"
											? userLabel
											: hasConversation || captionRole === "assistant"
												? aiLabel
												: ""}
									</p>
									<p
										className={`mt-1.5 font-display text-[clamp(17px,2.2vw,20px)] font-semibold leading-[1.4] tracking-[-0.012em] ${
											captionRole === "user"
												? "inline-block rounded-[20px] bg-accent px-4 py-1.5 text-accent-content"
												: captionRole === "assistant"
													? "text-ink"
													: "text-ink-2"
										}`}
									>
										{captionText}
									</p>
								</div>
							</div>
						</section>

						{showCaptions && hasConversation && (
							<div
								ref={transcriptRef}
								className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-lg border border-line-soft bg-surface/40 p-3"
							>
								<div className="flex flex-col gap-2.5">
									{messages.map((message, index) => (
										<div
											key={`${message.role}-${index}`}
											className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
										>
											<div
												className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-[1.45] ${message.role === "user"
													? "bg-accent text-accent-content"
													: "border border-line-soft bg-paper text-ink"
													}`}
											>
												{message.content}
											</div>
										</div>
									))}
									{busy && <TypingIndicator who={aiLabel} />}
									{error && (
										<p className="rounded-md bg-danger/10 px-3 py-1.5 font-mono text-xs text-danger">
											{error}
										</p>
									)}
								</div>
							</div>
						)}

						{/* Your-line cue in ready mode */}
						{conversationStyle === "ready" && hasConversation && !busy && (
							<section
								aria-label="Your next line"
								className="mt-3 flex-none rounded-lg border border-accent/30 bg-accent/5 px-4 py-3"
							>
								<p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-deep">
									{transcriptComplete ? "Transcript complete" : `Your line · ${userLabel}`}
								</p>
								<p className="mt-1 text-sm leading-[1.5] text-ink">
									{transcriptComplete
										? "You've reached the end of the transcript. Hit Finish for your feedback."
										: cueText ?? "Answer the interviewer, then tap to speak when you're ready."}
								</p>
							</section>
						)}

						{hasConversation && !showCaptions && <div className="min-h-0 flex-1" />}

						<footer className="flex-none pb-4 pt-2">
							{!voiceSupported && (
								<div role="alert" className="alert alert-warning mb-2 text-sm">
									<span>Voice input is not supported in this browser.</span>
								</div>
							)}

							<button
								type="button"
								onClick={toggleClickToSpeak}
								disabled={busy || !voiceSupported || !canSpeak}
								aria-label={listening ? "Stop listening" : "Start listening"}
								aria-pressed={listening}
								className={`btn btn-lg btn-block min-h-[56px] gap-2.5 border-0 px-6 text-base font-semibold text-paper focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper ${listening ? "animate-mic-listen bg-accent-dark" : "bg-accent hover:bg-accent-dark"
									}`}
							>
								<IconMic className="size-6" />
								{listening
									? "Listening… tap to stop"
									: transcriptComplete
										? "Transcript complete"
										: readyLive
											? "Tap to answer"
											: "Tap to speak"}
							</button>
						</footer>
					</div>
				</div>
			)}
		</div>
	);
}
