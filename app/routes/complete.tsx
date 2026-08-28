import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { Route } from "./+types/complete";
import { AppShell } from "~/components/AppShell";
import { Button } from "~/components/Button";
import { ScoreRing } from "~/components/ScoreRing";
import { getScenario } from "~/data/scenarios";
import { getSession, type Session } from "~/lib/storage";
import { LEVEL_CEFR } from "~/lib/stats";
import { formatClock } from "~/lib/format";

export function meta({}: Route.MetaArgs) {
	return [{ title: "Practice complete · TOLK" }];
}

export default function Complete() {
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

	const scenario = getScenario(session.scenarioId);
	const durationSeconds = Math.max(
		0,
		Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000),
	);

	return (
		<AppShell active="practice">
			<div className="mx-auto mt-6 max-w-[520px] rounded-lg bg-paper px-10 py-14 text-center shadow-sm ring-1 ring-line">
				<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
					Session complete
				</p>
				<h1 className="mt-3 font-display text-[clamp(28px,3.4vw,38px)] font-semibold tracking-[-0.015em] text-ink">
					Practice complete
				</h1>
				<p className="mt-2 text-muted">{scenario?.title ?? "Conversation"}</p>

				<div className="my-8 grid place-items-center">
					<ScoreRing value={session.score} label="/100" />
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<p className="font-mono text-lg font-semibold text-ink">{formatClock(durationSeconds)}</p>
						<p className="mt-1 text-sm text-muted">Duration</p>
					</div>
					<div>
						<p className="font-mono text-lg font-semibold text-ink">{LEVEL_CEFR[session.level]}</p>
						<p className="mt-1 text-sm text-muted">Level</p>
					</div>
				</div>

				<div className="mt-8 grid gap-3 sm:grid-cols-2">
					<Button to={`/results/${session.id}`}>See Feedback</Button>
					<Button to={`/practice/${session.scenarioId}/setup`} variant="secondary">
						Practice Again
					</Button>
				</div>
			</div>
		</AppShell>
	);
}
