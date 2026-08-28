import { useEffect, useState } from "react";
import type { Route } from "./+types/progress";
import { AppShell } from "~/components/AppShell";
import { Badge } from "~/components/Badge";
import { Button } from "~/components/Button";
import { EmptyState } from "~/components/EmptyState";
import { StatCard } from "~/components/StatCard";
import { CATEGORIES, type EnglishLevel } from "~/data/scenarios";
import { getSessions, loadPrefs, type Session } from "~/lib/storage";
import {
	averageOverall,
	bestStreak,
	currentStreak,
	LEVEL_CEFR,
	recommendScenario,
	scoreDeltas,
	totalMinutes,
} from "~/lib/stats";

export function meta({}: Route.MetaArgs) {
	return [{ title: "Your progress · TOLK" }];
}

const LEVEL_DESCRIPTION: Record<EnglishLevel, string> = {
	beginner: "A2 · basic conversations, building confidence",
	intermediate: "B1 · workplace-conversation ready",
	advanced: "C1 · polished and natural",
};

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export default function Progress() {
	const [sessions, setSessions] = useState<Session[]>([]);
	const [level, setLevel] = useState<EnglishLevel>("intermediate");

	useEffect(() => {
		setSessions(getSessions());
		const prefs = loadPrefs();
		if (prefs) setLevel(prefs.level);
	}, []);

	const deltas = scoreDeltas(sessions);
	const streak = currentStreak(sessions);
	const best = bestStreak(sessions);
	const minutes = totalMinutes(sessions);
	const recommendation = recommendScenario(sessions);

	const now = Date.now();
	const recentMonth = sessions.filter((s) => new Date(s.endedAt).getTime() >= now - MONTH_MS);
	const older = sessions.filter((s) => new Date(s.endedAt).getTime() < now - MONTH_MS);
	const recentAvg = averageOverall(recentMonth);
	const olderAvg = averageOverall(older);
	const monthDelta = recentAvg !== null && olderAvg !== null ? recentAvg - olderAvg : null;

	return (
		<AppShell active="progress">
			<div className="max-w-[620px]">
				<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
					Progress
				</p>
				<h1 className="mt-2 font-display text-[clamp(28px,3.4vw,40px)] font-semibold tracking-[-0.015em] text-ink">
					Your progress
				</h1>
				<p className="mt-3 text-muted">
					How your Business English is trending, based on your practice sessions.
				</p>
			</div>

			<div className="mt-6 grid gap-4 sm:grid-cols-3">
				<StatCard label="Overall level" value={LEVEL_CEFR[level]} note={LEVEL_DESCRIPTION[level]} />
				<StatCard
					label="Overall since last month"
					value={monthDelta === null ? "N/A" : monthDelta > 0 ? `+${monthDelta}` : String(monthDelta)}
					note={monthDelta === null ? "Not enough data to compare yet." : `${sessions.length} sessions · ${minutes} minutes spoken`}
					delta={monthDelta === null ? undefined : { value: `${monthDelta > 0 ? "+" : ""}${monthDelta}`, direction: monthDelta >= 0 ? "up" : "down" }}
				/>
				<StatCard label="Current streak" value={`${streak} days`} note={`Best streak: ${best} days`} />
			</div>

			<section className="mt-8">
				<h2 className="mb-4 font-display text-[22px] font-semibold tracking-[-0.015em] text-ink">
					Skills
				</h2>
				{deltas.length === 0 ? (
					<div className="rounded-lg border border-dashed border-line bg-paper">
						<EmptyState
							title="No skill trends yet."
							body="Finish at least two sessions with feedback and your skill trends will appear here."
						>
							<Button to="/practice">Start practicing</Button>
						</EmptyState>
					</div>
				) : (
					<div className="grid gap-4 sm:grid-cols-2">
						{deltas.map((delta) => (
							<div key={delta.key} className="rounded-lg border border-line bg-paper p-6">
								<div className="flex items-baseline justify-between gap-3">
									<span className="text-sm font-semibold text-ink-2">{delta.label}</span>
									<span className="flex items-baseline gap-2">
										<span className="font-mono text-sm font-semibold text-meta line-through">
											{delta.previous}
										</span>
										<span className="font-mono text-lg font-semibold text-ink">{delta.current}</span>
										<span className="font-mono text-xs font-semibold text-success">
											{delta.delta > 0 ? `+${delta.delta}` : String(delta.delta)}
										</span>
									</span>
								</div>
								<div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface">
									<div
										className="h-full rounded-full bg-accent"
										style={{ width: `${delta.current}%`, transition: "width 0.6s ease" }}
									/>
								</div>
								<p className="mt-2.5 text-sm text-muted">{delta.note}</p>
							</div>
						))}
					</div>
				)}
			</section>

			{recommendation && (
				<section className="mt-8">
					<div className="flex flex-wrap items-start justify-between gap-4 rounded-lg bg-surface p-6">
						<div className="max-w-[560px]">
							<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
								Focus next
							</p>
							<h2 className="mt-2.5 font-display text-2xl font-semibold tracking-[-0.015em] text-ink">
								{recommendation.title}
							</h2>
							<div className="mt-2 flex flex-wrap gap-2">
								<Badge>{recommendation.difficulty}</Badge>
								<Badge>{CATEGORIES.find((c) => c.id === recommendation.category)?.label}</Badge>
							</div>
							<p className="mt-2.5 text-sm leading-relaxed text-muted">{recommendation.objective}</p>
						</div>
						<Button to={`/practice/${recommendation.id}/setup`}>Practice</Button>
					</div>
				</section>
			)}
		</AppShell>
	);
}
