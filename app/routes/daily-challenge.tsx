import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/daily-challenge";
import { AppShell } from "~/components/AppShell";
import { Badge } from "~/components/Badge";
import { IconCheck, IconClock } from "~/components/icons";
import { SCENARIOS, type Scenario } from "~/data/scenarios";
import { getSessions, type Session } from "~/lib/storage";
import { bestStreak, currentStreak } from "~/lib/stats";

export function meta({}: Route.MetaArgs) {
	return [{ title: "Daily Challenge · TOLK" }];
}

function challengeScenario(): Scenario {
	const start = new Date(2026, 0, 1).getTime();
	const today = new Date();
	const dayIndex = Math.max(0, Math.floor((today.getTime() - start) / 86400000));
	return SCENARIOS[dayIndex % SCENARIOS.length];
}

function dayKey(date: Date): string {
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default function DailyChallenge() {
	const [sessions, setSessions] = useState<Session[]>([]);
	const [skipNote, setSkipNote] = useState(false);

	useEffect(() => {
		setSessions(getSessions());
	}, []);

	const scenario = challengeScenario();
	const streak = currentStreak(sessions);
	const best = bestStreak(sessions);
	const sessionDays = new Set(sessions.map((s) => dayKey(new Date(s.endedAt))));

	const week: { label: string; done: boolean; today: boolean }[] = Array.from({ length: 7 }, (_, index) => {
		const date = new Date();
		date.setDate(date.getDate() - (6 - index));
		return {
			label: date.toLocaleDateString([], { weekday: "short" }),
			done: sessionDays.has(dayKey(date)),
			today: index === 6,
		};
	});

	return (
		<AppShell active="practice">
			<div className="max-w-[620px]">
				<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
					Daily Challenge
				</p>
				<h1 className="mt-2 font-display text-[clamp(28px,3.4vw,40px)] font-semibold tracking-[-0.015em] text-ink">
					Today&rsquo;s challenge
				</h1>
				<p className="mt-3 text-muted">
					A focused short scenario, refreshed every day. Finish it to keep your streak.
				</p>
			</div>

			<div className="mt-6 grid gap-4 md:grid-cols-3">
				<div className="rounded-xl bg-paper p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] ring-1 ring-line">
					<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
						Scenario · {scenario.difficulty}
					</p>
					<h2 className="mt-2.5 font-display text-2xl font-semibold tracking-[-0.015em] text-ink">
						{scenario.title}
					</h2>
					<p className="mt-2.5 text-sm leading-[1.5] text-muted">
						{scenario.context} Goal: {scenario.objective}
					</p>
					<div className="mt-4 flex flex-wrap items-center gap-4">
						<span className="flex items-center gap-1.5 text-sm text-muted">
							<IconClock className="size-4 text-meta" />
							{scenario.durationMin} min
						</span>
						<Badge>{scenario.aiRole}</Badge>
					</div>
					{skipNote ? (
						<p className="mt-5 rounded-md bg-surface px-3 py-2 text-sm text-muted">
							Come back tomorrow for a new challenge. Your streak stays until you skip a day.
						</p>
					) : (
						<div className="mt-5 flex flex-wrap gap-3">
							<Link
								to={`/practice/${scenario.id}/setup`}
								className="inline-flex min-h-[44px] items-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent-dark"
							>
								Start Challenge
							</Link>
							<button
								type="button"
								onClick={() => setSkipNote(true)}
								className="inline-flex min-h-[44px] items-center rounded-full border border-line bg-paper px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-meta"
							>
								Skip
							</button>
						</div>
					)}
				</div>

				<div className="rounded-xl border border-line bg-paper p-6">
					<p className="font-mono text-[38px] font-semibold text-ink">{streak}</p>
					<p className="mt-1 text-sm font-semibold text-ink-2">Day streak</p>
					<p className="mt-1.5 text-sm text-muted">
						Best: {best} days. Complete today&rsquo;s challenge to keep it going.
					</p>
					<div className="mt-4 flex flex-wrap gap-1.5">
						{week.map((day) => (
							<Badge key={day.label} dot={day.today ? "warn" : day.done ? "success" : "muted"}>
								{day.label}
							</Badge>
						))}
					</div>
				</div>

				<div className="rounded-xl border border-line bg-paper p-6">
					<p className="text-base font-semibold text-ink">How it works</p>
					<ul className="mt-3 flex flex-col gap-2.5">
						{[
							"One new scenario each day",
							"Automatic feedback at the end",
							"Words you miss go to Vocabulary",
							"Streak resets if you skip a day",
						].map((item) => (
							<li key={item} className="flex items-center gap-2.5 text-sm text-ink-2">
								<span className="grid size-5 flex-none place-items-center rounded-full bg-success/15 text-success">
									<IconCheck className="size-3" />
								</span>
								{item}
							</li>
						))}
					</ul>
				</div>
			</div>
		</AppShell>
	);
}
