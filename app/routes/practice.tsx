import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { Route } from "./+types/practice";
import { CATEGORIES, getScenario } from "~/data/scenarios";
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
	type Session,
	type SessionDraft,
	type Setup,
} from "~/lib/storage";
import { formatClock } from "~/lib/format";
import {
	isSpeechSupported,
	rateFromSetting,
	useSTT,
	useTTS,
} from "~/lib/speech";
import { Orb, type OrbState } from "~/components/Orb";
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

	const startedAtRef = useRef<string | null>(null);
	const openedRef = useRef(false);
	const busyRef = useRef(false);
	const listeningRef = useRef(false);
	const orbRef = useRef<OrbState>("idle");
	const transcriptRef = useRef<HTMLDivElement | null>(null);

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

	const stt = useSTT();
	const tts = useTTS();

	useEffect(() => {
		if (!scenario) navigate("/", { replace: true });
	}, [scenario, navigate]);

	useEffect(() => {
		if (!getSetup()) setSetupState(setupFromPrefs());
		setDraft(loadDraft());
		setMode(
			getSetup()?.mode ??
			loadDraft()?.mode ??
			loadPrefs()?.mode ??
			(isSpeechSupported() ? "voice" : "text"),
		);
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
				const next: Setup = {
					level: current?.level ?? "intermediate",
					provider: defaultKey.provider as Setup["provider"],
					model: defaultKey.model,
					serverKey: true,
					mode:
						current?.mode ??
						loadDraft()?.mode ??
						loadPrefs()?.mode ??
						(isSpeechSupported() ? "voice" : "text"),
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

	const begin = useCallback(
		async (config: Setup) => {
			if (!scenario || !effectiveScenario || openedRef.current) return;
			openedRef.current = true;
			startedAtRef.current = new Date().toISOString();
			setStarted(true);
			clearDraft();
			setBusy(true);
			setError(null);
			setOrbState("processing");
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
		tts.controller.cancel();
		listeningRef.current = true;
		setListening(true);
		setOrbState("listening");
		setCaptionText("Listening… tap to stop");
		void stt.controller.start({
			onFinal: (text) => {
				if (!text) return;
				setCaptionText(text);
				void send(text);
			},
		});
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
		startListening();
	}

	// Sinkronkan state `listening` lokal dengan isListening provider aktif (auto-stop Web Speech).
	useEffect(() => {
		if (stt.controller.isListening) {
			listeningRef.current = true;
			return;
		}
		if (listeningRef.current) {
			listeningRef.current = false;
			setListening(false);
			if (orbRef.current === "listening") setOrbState("idle");
		}
	}, [stt.controller.isListening]);

	// Tampilkan interim transcript live sebagai caption saat mendengarkan.
	useEffect(() => {
		if (listeningRef.current && stt.controller.interimTranscript) {
			setCaptionText(stt.controller.interimTranscript);
		}
	}, [stt.controller.interimTranscript]);

	// Error dari provider STT (mis. mik tidak diizinkan) → kembali idle dengan pesan.
	useEffect(() => {
		if (!stt.controller.error) return;
		listeningRef.current = false;
		setListening(false);
		if (orbRef.current === "listening") setOrbState("idle");
		setCaptionText("Didn't catch that. Tap again or type below.");
	}, [stt.controller.error]);

	async function finish() {
		if (!setup || !scenario || !effectiveScenario || messages.length === 0 || busy) return;
		tts.controller.cancel();
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
	const showConfigure = !setupReady(setup) && !hasConversation;

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
					<p className="truncate text-[13px] text-muted">You · {scenario.userRole}</p>
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
							<div className="my-auto flex w-full max-w-[520px] flex-col items-center rounded-[2rem] px-6 py-8 sm:px-10 sm:py-10">
								<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted" aria-live="polite">
									{STATE_LABELS[orbState]}
								</p>
								<div className="mt-5 grid place-items-center">
									<Orb
										name={aiLabel}
										sub="Your coach"
										state={orbState}
										className={
											hasConversation
												? "size-[clamp(112px,16vw,140px)]"
												: "size-[clamp(140px,20vw,168px)]"
										}
									/>
								</div>
								<div className="mt-5 max-w-[480px] text-center" aria-live="polite">
									<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
										{aiLabel}
									</p>
									<p className="mt-1.5 font-display text-[clamp(17px,2.2vw,20px)] font-semibold leading-[1.4] tracking-[-0.012em] text-ink">
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

						{hasConversation && !showCaptions && <div className="min-h-0 flex-1" />}

						<footer className="flex-none pb-4 pt-2">
							{!voiceSupported && (
							<p className="rounded-md bg-surface px-3 py-2 text-center text-sm text-muted">
								Voice needs Chrome, Edge, or Safari. Check your microphone permission, or
								type your replies instead.
							</p>
							)}

							<button
								type="button"
								onClick={toggleClickToSpeak}
								disabled={busy || !voiceSupported}
								aria-label="Tap to speak"
								className={`inline-flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-lg px-6 py-3.5 text-base font-semibold text-paper transition-colors focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper focus:outline-none disabled:pointer-events-none disabled:opacity-40 ${listening ? "animate-mic-listen bg-accent-dark" : "bg-accent hover:bg-accent-dark"
									}`}
							>
								<IconMic className="size-6" />
								{listening ? "Listening… tap to stop" : "Tap to speak"}
							</button>
						</footer>
					</div>
				</div>
			)}
		</div>
	);
}
