import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/results";
import { AppShell } from "~/components/AppShell";
import { Badge } from "~/components/Badge";
import { Button } from "~/components/Button";
import { EmptyState } from "~/components/EmptyState";
import { SkillBar } from "~/components/SkillBar";
import { ScoreRing } from "~/components/ScoreRing";
import { ChatBubble } from "~/components/ChatBubble";
import { IconReplay } from "~/components/icons";
import { getScenario } from "~/data/scenarios";
import { generateFeedback, overallScore } from "~/lib/feedback";
import {
	deleteSession,
	getSession,
	getSetup,
	saveSession,
	setSetup,
	setupReady,
	type Session,
} from "~/lib/storage";
import { formatDateTime, formatDuration } from "~/lib/format";

export function meta({}: Route.MetaArgs) {
	return [{ title: "Your practice results · TOLK" }];
}

const DIMENSION_ORDER: { key: "fluency" | "grammar" | "vocabulary" | "clarity" | "professionalism"; label: string }[] = [
	{ key: "fluency", label: "Fluency" },
	{ key: "grammar", label: "Grammar" },
	{ key: "vocabulary", label: "Vocabulary" },
	{ key: "clarity", label: "Clarity" },
	{ key: "professionalism", label: "Professional" },
];

export default function Results() {
	const { sessionId } = useParams();
	const navigate = useNavigate();
	const [session, setSession] = useState<Session | null>(null);

	useEffect(() => {
		if (!sessionId) {
			navigate("/history", { replace: true });
			return;
		}
		const found = getSession(sessionId);
		if (!found) {
			navigate("/history", { replace: true });
			return;
		}
		setSession(found);
	}, [sessionId, navigate]);

	if (!session) return null;

	return <ResultsView session={session} onChange={setSession} />;
}

function speak(text: string) {
	if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
	window.speechSynthesis.cancel();
	const utterance = new SpeechSynthesisUtterance(text);
	utterance.rate = 0.95;
	window.speechSynthesis.speak(utterance);
}

function ResultsView({
	session,
	onChange,
}: {
	session: Session;
	onChange: (session: Session) => void;
}) {
	const navigate = useNavigate();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const scenario = getScenario(session.scenarioId);
	const setup = getSetup();
	const canRetry = Boolean(setupReady(setup) && session.feedback === null);
	const dimensionRows = session.feedback
		? DIMENSION_ORDER.map((d) => ({ label: d.label, value: session.feedback!.scores[d.key] }))
		: [];

	async function retryFeedback() {
		if (!setupReady(setup) || !setup || !scenario || busy) return;
		setBusy(true);
		setError(null);
		try {
			const feedback = await generateFeedback(setup, scenario, session.level, session.messages);
			const updated: Session = { ...session, score: overallScore(feedback), feedback };
			saveSession(updated);
			onChange(updated);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not generate feedback.");
		} finally {
			setBusy(false);
		}
	}

	function practiceAgain() {
		if (!scenario) return;
		setSetup({
			level: session.level,
			provider: session.provider,
			model: session.model,
			...(setup?.serverKey ? { serverKey: true } : {}),
			mode: setup?.mode ?? "text",
		});
		navigate(`/practice/${session.scenarioId}`);
	}

	function removeSession() {
		deleteSession(session.id);
		navigate("/history", { replace: true });
	}

	return (
		<AppShell active="history">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
						{formatDateTime(session.endedAt)} · {formatDuration(session.startedAt, session.endedAt)}
					</p>
					<h1 className="mt-2 font-display text-[clamp(26px,3.2vw,38px)] font-semibold tracking-[-0.015em] text-ink">
						Your practice results
					</h1>
					<p className="mt-1.5 text-muted">
						{scenario?.title ?? "Conversation"} · {scenario?.difficulty ?? session.level}
					</p>
				</div>
				<div className="grid place-items-center">
					<ScoreRing value={session.score} size={120} strokeWidth={10} label="/100" />
				</div>
			</div>

			{session.feedback ? (
				<>
					<section className="mt-6 rounded-lg border border-line bg-paper p-6">
						<p className="mb-5 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
							Score overview
						</p>
						<div className="flex flex-col gap-5">
							{dimensionRows.map((row) => (
								<SkillBar key={row.label} label={row.label} value={row.value} />
							))}
						</div>
					</section>

					{session.feedback.strengths.length > 0 && (
						<section className="mt-8">
							<h2 className="font-display text-[22px] font-semibold tracking-[-0.015em] text-ink">
								What you did well
							</h2>
							<div className="mt-3 rounded-lg border border-line bg-paper p-5">
								<ul className="flex flex-col gap-2.5">
									{session.feedback.strengths.map((strength, index) => (
										<li key={index} className="flex items-start gap-2.5 text-sm text-ink-2">
											<span className="mt-1 size-[6px] flex-none rounded-full bg-success" />
											{strength}
										</li>
									))}
								</ul>
							</div>
						</section>
					)}

					{session.feedback.corrections.length > 0 && (
						<section className="mt-8">
							<div className="mb-4 flex items-center justify-between">
								<h2 className="font-display text-[22px] font-semibold tracking-[-0.015em] text-ink">
									Corrections
								</h2>
								<Badge>
									{session.feedback.corrections.length}{" "}
									{session.feedback.corrections.length === 1 ? "turn" : "turns"} refined
								</Badge>
							</div>
							<div className="flex flex-col gap-4">
								{session.feedback.corrections.map((correction, index) => (
									<div key={index} className="rounded-lg border border-line bg-paper p-5">
										<p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
											You said
										</p>
										<blockquote className="mt-1 text-base leading-[1.45] text-ink">
											&ldquo;{correction.original}&rdquo;
										</blockquote>
										<p className="mt-5 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
											Better
										</p>
										<blockquote className="mt-1 text-base font-medium leading-[1.45] text-accent-dark">
											&ldquo;{correction.correction}&rdquo;
										</blockquote>
										{correction.explanation && (
											<p className="mt-4 border-t border-line-soft pt-4 text-sm leading-relaxed text-muted">
												{correction.explanation}
											</p>
										)}
										<div className="mt-4 flex gap-3">
											<Button variant="secondary" size="sm" onClick={() => speak(correction.correction)}>
												<IconReplay className="size-4" />
												Listen
											</Button>
											<Button size="sm" to={`/practice/${session.scenarioId}`}>
												Practice this
											</Button>
										</div>
									</div>
								))}
							</div>
						</section>
					)}

					{session.feedback.recommendations.length > 0 && (
						<section className="mt-8">
							<h2 className="font-display text-[22px] font-semibold tracking-[-0.015em] text-ink">
								Recommended practice
							</h2>
							<div className="mt-3 rounded-lg border border-line bg-paper p-5">
								<ol className="flex flex-col gap-3">
									{session.feedback.recommendations.map((recommendation, index) => (
										<li key={index} className="flex gap-3 text-sm text-ink-2">
											<span className="grid size-5 flex-none place-items-center rounded-full bg-accent text-xs font-semibold text-paper">
												{index + 1}
											</span>
											{recommendation}
										</li>
									))}
								</ol>
							</div>
						</section>
					)}
				</>
			) : (
				<div className="mt-6 rounded-lg border border-line bg-paper">
					<EmptyState
						title="Feedback wasn't generated"
						body="Your conversation was saved, but we couldn't analyze it. If your API key is still active in this session, you can try again."
					>
						{error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
						{canRetry && (
							<Button onClick={() => void retryFeedback()} disabled={busy}>
								{busy ? "Analyzing…" : "Try again"}
							</Button>
						)}
						<Button to="/practice" variant="secondary">
							Practice another scenario
						</Button>
					</EmptyState>
				</div>
			)}

			<section className="mt-8">
				<h2 className="font-display text-[22px] font-semibold tracking-[-0.015em] text-ink">
					Conversation transcript
				</h2>
				<div className="mt-3 flex flex-col gap-3">
					{session.messages.map((message, index) => (
						<ChatBubble key={`${message.role}-${index}`} message={message} who={scenario?.aiRole} />
					))}
				</div>
			</section>

			<div className="mt-8 flex flex-wrap items-center gap-3">
				<Button onClick={practiceAgain}>Practice this again</Button>
				<Button to="/practice" variant="secondary">
					New scenario
				</Button>
				<button
					type="button"
					onClick={removeSession}
					className="ml-auto inline-flex min-h-[44px] items-center px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-danger focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper focus:outline-none"
				>
					Delete session
				</button>
			</div>
		</AppShell>
	);
}
