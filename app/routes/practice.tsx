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
	loadSettings,
	saveSession,
	setSetup,
	setupFromPrefs,
	type Session,
	type SessionDraft,
	type Setup,
} from "~/lib/storage";
import { formatClock } from "~/lib/format";
import { ProviderSetupForm } from "~/components/ProviderSetupForm";
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

	const [setup, setSetupState] = useState<Setup | null>(() => getSetup());
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [draft, setDraft] = useState<SessionDraft | null>(null);
	const [input, setInput] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showCaptions, setShowCaptions] = useState(true);
	const [orbState, setOrbState] = useState<OrbState>("idle");
	const [seconds, setSeconds] = useState(0);
	const [started, setStarted] = useState(false);
	const [captionText, setCaptionText] = useState("Ready when you are. Type your response below.");

	const startedAtRef = useRef<string | null>(null);
	const openedRef = useRef(false);
	const busyRef = useRef(false);
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

	const mode = setup?.mode ?? draft?.mode ?? "text";

	useEffect(() => {
		if (!scenario) navigate("/", { replace: true });
	}, [scenario, navigate]);

	useEffect(() => {
		if (!getSetup()) setSetupState(setupFromPrefs());
		setShowCaptions(loadSettings().captions);
		setDraft(loadDraft());
	}, []);

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
			} catch (cause) {
				openedRef.current = false;
				setOrbState("error");
				setError(cause instanceof Error ? cause.message : "Failed to start the conversation.");
			} finally {
				setBusy(false);
				setOrbState("idle");
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[scenario, effectiveScenario],
	);

	useEffect(() => {
		if (setup?.apiKey && messages.length === 0 && !openedRef.current && !busy) {
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
			mode: setup?.mode ?? draft?.mode ?? "text",
		};
		setSetup(next);
		setSetupState(next);
	}

	async function send(textOverride?: string) {
		const text = (textOverride ?? input).trim();
		if (!text || !setup?.apiKey || !scenario || !effectiveScenario || busy) return;
		const history: ChatMessage[] = [...messages, { role: "user", content: text }];
		setMessages(history);
		setInput("");
		setBusy(true);
		busyRef.current = true;
		setOrbState("processing");
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
		} catch (cause) {
			setMessages(messages);
			setOrbState("error");
			setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
		} finally {
			setBusy(false);
			busyRef.current = false;
		}
	}

	async function finish() {
		if (!setup || !scenario || !effectiveScenario || messages.length === 0 || busy) return;
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
		setOrbState("speaking");
		setCaptionText(last.content);
		window.setTimeout(() => setOrbState("idle"), 1600);
	}

	function onMicRelease() {
		if (busyRef.current) return;
		setOrbState("idle");
		setCaptionText("Voice transcription is on the roadmap. Type your response below.");
		setTimeout(() => inputRef.current?.focus(), 50);
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
					className="grid size-[44px] flex-none place-items-center rounded-full border border-line bg-paper text-ink-2 transition hover:border-meta hover:text-ink"
				>
					<IconArrowLeft />
				</button>
				<div className="min-w-0 flex-1">
					<p className="truncate font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">
						{scenario.title}
					</p>
					<p className="truncate text-[13px] text-muted">
						You · {aiLabel}
					</p>
				</div>
				<span className="hidden font-mono text-sm font-semibold text-ink-2 sm:block">
					{formatClock(seconds)}
				</span>
				<div className="hidden sm:block">
					<Switch
						checked={showCaptions}
						onChange={setShowCaptions}
						label="Captions"
						id="captions-toggle"
					/>
				</div>
				<button
					type="button"
					onClick={replayLast}
					disabled={!hasConversation}
					aria-label="Replay last AI response"
					className="grid size-[44px] flex-none place-items-center rounded-full border border-line bg-paper text-ink-2 transition hover:border-meta hover:text-ink disabled:pointer-events-none disabled:opacity-40"
				>
					<IconReplay />
				</button>
				<button
					type="button"
					onClick={() => void finish()}
					disabled={busy || !hasConversation}
					className="inline-flex min-h-[38px] items-center rounded-full px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface disabled:pointer-events-none disabled:opacity-40"
				>
					Finish
				</button>
			</header>

			{showConfigure ? (
				<main className="flex flex-1 items-center justify-center px-4 pb-[10vh]">
					<div className="w-full max-w-md rounded-xl border border-line bg-paper p-6">
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
				<div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-4 py-5 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:overflow-hidden md:py-6">
					<section className="flex flex-col items-center">
						<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted" aria-live="polite">
							{STATE_LABELS[orbState]}
						</p>
						<div className="mt-6 grid place-items-center">
							<Orb
								name={aiLabel}
								sub="Your coach"
								state={orbState}
								className={hasConversation ? "size-[132px]" : "size-[clamp(150px,22vw,184px)]"}
							/>
						</div>
						<div className="mt-6 max-w-[560px] text-center" aria-live="polite">
							<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
								{aiLabel}
							</p>
							<p className="mt-2 font-display text-[clamp(18px,2.4vw,22px)] font-semibold leading-[1.4] tracking-[-0.012em] text-ink">
								{captionText}
							</p>
						</div>

						{mode === "voice" && (
							<div className="mt-8 flex flex-col items-center gap-5">
								<button
									type="button"
									aria-label="Hold to speak"
									onPointerDown={() => {
										if (busy) return;
										setOrbState("listening");
										setCaptionText("Listening… release to send");
									}}
									onPointerUp={onMicRelease}
									onPointerLeave={onMicRelease}
									className={`grid size-[84px] place-items-center rounded-full bg-accent text-paper transition active:scale-95 ${
										orbState === "listening" ? "animate-mic-listen" : ""
									}`}
								>
									<IconMic className="size-[30px]" />
								</button>
								<p className="text-sm text-muted">
									Hold to speak <kbd className="mx-0.5 rounded-sm border border-line bg-surface px-1.5 font-mono text-xs">Space</kbd>
								</p>
							</div>
						)}
					</section>

					<aside className="flex min-h-0 flex-col">
						<p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
							Transcript
						</p>
						<div
							ref={transcriptRef}
							className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
						>
							{messages.map((message, index) => (
								<div key={`${message.role}-${index}`} className="flex flex-col gap-3">
									<div className="flex gap-3 rounded-xl border border-line-soft bg-paper p-4">
										<div className="min-w-0">
											<p className="mb-1 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-muted">
												{message.role === "user" ? "You" : aiLabel}
											</p>
											<p className="whitespace-pre-wrap text-base leading-[1.45] text-ink">
												{message.content}
											</p>
										</div>
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

						{!showCaptions && (
							<p className="mt-3 text-center font-mono text-xs text-muted">
								Captions hidden
							</p>
						)}

						<form
							className="mt-4 flex flex-none items-center gap-3"
							onSubmit={(event) => {
								event.preventDefault();
								void send();
							}}
						>
							<input
								ref={inputRef}
								value={input}
								onChange={(event) => setInput(event.target.value)}
								placeholder={busy ? "Coach is responding…" : "Type your response…"}
								aria-label="Type your response"
								className="min-h-[48px] min-w-0 flex-1 rounded-[4px] border border-meta bg-paper px-3.5 py-3 text-base text-ink placeholder:text-meta transition hover:border-ink-2 focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,#3e6ae1_30%,transparent)] focus:outline-none"
							/>
							<button
								type="submit"
								disabled={busy || !input.trim()}
								aria-label="Send"
								className="grid size-[48px] flex-none place-items-center rounded-lg bg-accent text-paper transition hover:bg-accent-dark active:scale-95 disabled:pointer-events-none disabled:opacity-40"
							>
								<IconSend />
							</button>
						</form>
					</aside>
				</div>
			)}
		</div>
	);
}
