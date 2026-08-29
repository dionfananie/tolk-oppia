import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { Route } from "./+types/practice";
import { CATEGORIES, getScenario } from "~/data/scenarios";
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
	type Session,
	type SessionDraft,
	type Setup,
} from "~/lib/storage";
import { formatClock } from "~/lib/format";
import {
	createRecognizer,
	isSpeechSupported,
	isTtsSupported,
	rateFromSetting,
	speak,
	stopSpeaking,
} from "~/lib/speech";
import { ProviderSetupForm } from "~/components/ProviderSetupForm";
import { Orb, type OrbState } from "~/components/Orb";
import { Segmented } from "~/components/Segmented";
import { Switch } from "~/components/Switch";
import { TypingIndicator } from "~/components/ChatBubble";
import { IconArrowLeft, IconMic, IconReplay, IconSend } from "~/components/icons";

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

export default function Practice() {
	const { scenarioId } = useParams();
	const navigate = useNavigate();
	const scenario = scenarioId ? getScenario(scenarioId) : undefined;

	const [setup, setSetupState] = useState<Setup | null>(() => getSetup());
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [draft, setDraft] = useState<SessionDraft | null>(null);
	const [mode, setMode] = useState<"voice" | "text">("text");
	const [input, setInput] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showCaptions, setShowCaptions] = useState(true);
	const [orbState, setOrbState] = useState<OrbState>("idle");
	const [listening, setListening] = useState(false);
	const [seconds, setSeconds] = useState(0);
	const [started, setStarted] = useState(false);
	const [captionText, setCaptionText] = useState("Ready when you are.");

	const startedAtRef = useRef<string | null>(null);
	const openedRef = useRef(false);
	const busyRef = useRef(false);
	const listeningRef = useRef(false);
	const orbRef = useRef<OrbState>("idle");
	const recognizerRef = useRef<ReturnType<typeof createRecognizer>>(null);
	const transcriptRef = useRef<HTMLDivElement | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);

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

	const voiceSupported = isSpeechSupported();
	const useVoice = mode === "voice" && voiceSupported;

	useEffect(() => {
		if (!scenario) navigate("/", { replace: true });
	}, [scenario, navigate]);

	useEffect(() => {
		if (!getSetup()) setSetupState(setupFromPrefs());
		setShowCaptions(loadSettings().captions);
		setDraft(loadDraft());
		setMode(
			getSetup()?.mode ??
				loadDraft()?.mode ??
				loadPrefs()?.mode ??
				(isSpeechSupported() ? "voice" : "text"),
		);
	}, []);

	useEffect(() => {
		orbRef.current = orbState;
	}, [orbState]);

	function autoSpeak(text: string) {
		if (!isTtsSupported()) return;
		const settings = loadSettings();
		setOrbState("speaking");
		speak(text, {
			rate: rateFromSetting(settings.speechRate),
			voiceUri: settings.voiceUri,
			onEnd: () => {
				if (!listeningRef.current) setOrbState("idle");
			},
		});
	}

	const begin = useCallback(
		async (config: Setup) => {
			if (!scenario || !effectiveScenario || openedRef.current) return;
			openedRef.current = true;
			startedAtRef.current = new Date().toISOString();
			setStarted(true);
			clearDraft();
			setBusy(true);
			setError(null);
			setOrbState("speaking");
			setCaptionText("Your coach is saying hello…");
			try {
				const opening = await openConversation(
					config,
					effectiveScenario,
					config.level,
					loadSettings().promptStyle,
				);
				setMessages([opening]);
				setCaptionText(opening.content);
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
		if (setup && setupReady(setup) && messages.length === 0 && !openedRef.current && !busy) {
			void begin(setup);
		}
	}, [setup, messages, begin, busy]);

	useEffect(() => {
		if (!started) return;
		const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
		return () => window.clearInterval(id);
	}, [started]);

	useEffect(() => {
		transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
	}, [messages, busy, showCaptions]);

	function saveSetupFromForm(partial: Omit<Setup, "level">) {
		if (!scenario) return;
		const next: Setup = {
			...partial,
			level: setup?.level ?? setupFromPrefs()?.level ?? "intermediate",
			mode,
		};
		setSetup(next);
		setSetupState(next);
	}

	function changeMode(next: "voice" | "text") {
		setMode(next);
		const base = setup ?? setupFromPrefs();
		if (base) setSetup({ ...base, mode: next });
	}

	async function send(textOverride?: string) {
		const text = (textOverride ?? input).trim();
		if (!text || !setupReady(setup) || !setup || !scenario || !effectiveScenario || busyRef.current) return;
		const history: ChatMessage[] = [...messages, { role: "user", content: text }];
		setMessages(history);
		setInput("");
		setBusy(true);
		busyRef.current = true;
		setOrbState("processing");
		setCaptionText(text);
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
			setCaptionText(reply);
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

	function startListening() {
		if (busyRef.current || listeningRef.current) return;
		stopSpeaking();
		listeningRef.current = true;
		setListening(true);
		setOrbState("listening");
		setCaptionText("Listening… tap to stop");
		const recognizer = createRecognizer({
			onFinal: (text) => {
				if (!text) return;
				setCaptionText(text);
				void send(text);
			},
			onInterim: (text) => {
				if (text) setCaptionText(text);
			},
			onEnd: () => {
				listeningRef.current = false;
				setListening(false);
				if (orbRef.current === "listening") setOrbState("idle");
			},
			onError: (err) => {
				listeningRef.current = false;
				setListening(false);
				if (err === "aborted" || err === "no-speech") {
					setOrbState("idle");
					setCaptionText("Didn't catch that. Tap again or type below.");
				} else {
					setOrbState("error");
					setCaptionText("Microphone unavailable. Type your response below.");
				}
			},
		});
		if (!recognizer) {
			listeningRef.current = false;
			setListening(false);
			return;
		}
		recognizerRef.current = recognizer;
		recognizer.start();
	}

	function stopListening() {
		recognizerRef.current?.stop();
	}

	function toggleClickToSpeak() {
		if (busyRef.current) return;
		if (listeningRef.current) {
			stopListening();
			return;
		}
		startListening();
	}

	async function finish() {
		if (!setup || !scenario || !effectiveScenario || messages.length === 0 || busy) return;
		stopSpeaking();
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
			setError(
				cause instanceof Error
					? cause.message
					: "Could not generate feedback. Your session was saved anyway.",
			);
		}
		saveSession(session);
		setBusy(false);
		navigate(`/complete/${session.id}`);
	}

	function replayLast() {
		const last = [...messages].reverse().find((m) => m.role === "assistant");
		if (!last) return;
		setCaptionText(last.content);
		autoSpeak(last.content);
	}

	if (!scenario || !effectiveScenario) {
		return null;
	}

	const category = CATEGORIES.find((c) => c.id === scenario.category)?.label ?? "Practice";
	const aiLabel = effectiveScenario.aiRole;
	const hasConversation = messages.length > 0;
	const showConfigure = !setup?.apiKey && !hasConversation;

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
					<p className="truncate text-[13px] text-muted">You · {aiLabel}</p>
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

			{showConfigure ? (
				<main className="flex flex-1 items-center justify-center px-4 pb-[10vh]">
					<div className="w-full max-w-md rounded-lg border border-line bg-paper p-6">
						<h1 className="font-display text-xl font-medium tracking-wide text-ink">
							Connect your AI provider
						</h1>
						<p className="mt-1 text-sm leading-relaxed text-muted">
							Add your DeepSeek or GLM API key to start the conversation. The key stays in this
							browser session and is never saved.
						</p>
						<div className="mt-6">
							<ProviderSetupForm initial={setup} onSave={saveSetupFromForm} />
						</div>
					</div>
				</main>
			) : (
				<div className="flex min-h-0 flex-1 flex-col">
					<div className="mx-auto flex w-full max-w-[720px] min-h-0 flex-1 flex-col px-4 sm:px-6">
						<section className="flex flex-none flex-col items-center pt-4">
							<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted" aria-live="polite">
								{STATE_LABELS[orbState]}
							</p>
							<div className="mt-5 grid place-items-center">
								<Orb
									name={aiLabel}
									sub="Your coach"
									state={orbState}
									className={hasConversation ? "size-[124px]" : "size-[clamp(140px,20vw,168px)]"}
								/>
							</div>
							<div className="mt-5 max-w-[560px] text-center" aria-live="polite">
								<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
									{aiLabel}
								</p>
								<p className="mt-1.5 font-display text-[clamp(17px,2.2vw,20px)] font-semibold leading-[1.4] tracking-[-0.012em] text-ink">
									{captionText}
								</p>
							</div>
						</section>

						{showCaptions && (
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
														? "bg-accent text-paper"
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

						<footer className="flex flex-none flex-col gap-3 py-4">
							{!voiceSupported && (
								<p className="rounded-md bg-surface px-3 py-2 text-center text-sm text-muted">
									Voice needs Chrome, Edge, or Safari. Microphone tak tersedia — periksa izin
									mikrofon atau gunakan browser yang mendukung speech.
								</p>
							)}

							<button
								type="button"
								onClick={toggleClickToSpeak}
								disabled={busy || !voiceSupported}
								aria-label="Click to speak"
								className={`inline-flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-lg px-6 py-3.5 text-base font-semibold text-paper transition-colors focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper focus:outline-none disabled:pointer-events-none disabled:opacity-40 ${listening ? "animate-mic-listen bg-accent-dark" : "bg-accent hover:bg-accent-dark"
									}`}
							>
								<IconMic className="size-6" />
								{listening ? "Listening… tap to stop" : "Click to Speak"}
							</button>
						</footer>
					</div>
				</div>
			)}
		</div>
	);
}
