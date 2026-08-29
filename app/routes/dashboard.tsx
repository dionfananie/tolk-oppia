import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/dashboard";
import { AppShell } from "~/components/AppShell";
import { Badge } from "~/components/Badge";
import { Button } from "~/components/Button";
import { EmptyState } from "~/components/EmptyState";
import { SkillBar } from "~/components/SkillBar";
import { IconChevronRight } from "~/components/icons";
import { getScenario, CATEGORIES, type EnglishLevel } from "~/data/scenarios";
import { getSetup, loadPrefs, getSessions, setupReady, type Session } from "~/lib/storage";
import { averageScores, currentStreak, LEVEL_CEFR, recommendScenario } from "~/lib/stats";
import { formatDuration, formatRelative } from "~/lib/format";

export function meta({}: Route.MetaArgs) {
	return [{ title: "Dashboard · TOLK" }];
}

const DIMENSION_ORDER: { key: "fluency" | "grammar" | "vocabulary" | "clarity" | "professionalism"; label: string }[] = [
	{ key: "fluency", label: "Fluency" },
	{ key: "grammar", label: "Grammar" },
	{ key: "vocabulary", label: "Vocabulary" },
	{ key: "professionalism", label: "Professional" },
];

function greeting(): string {
	const hour = new Date().getHours();
	if (hour < 12) return "Good morning.";
	if (hour < 18) return "Good afternoon.";
	return "Good evening.";
}

function todayLabel(): string {
	return new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

export default function Dashboard() {
	const [sessions, setSessions] = useState<Session[]>([]);
	const [level, setLevel] = useState<EnglishLevel | null>(null);
	const [configured, setConfigured] = useState(false);

	useEffect(() => {
		setSessions(getSessions());
		const prefs = loadPrefs();
		if (prefs) setLevel(prefs.level);
		setConfigured(setupReady(getSetup()));
	}, []);

	const recommendation = recommendScenario(sessions);
	const averages = averageScores(sessions);
	const streak = currentStreak(sessions);
	const recent = sessions.slice(0, 3);

	return (
		<AppShell active="dashboard">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
						{todayLabel()}
					</p>
					<h1 className="mt-2 font-display text-[clamp(26px,3.2vw,38px)] font-semibold tracking-[-0.015em] text-ink">
						{greeting()}
					</h1>
				</div>
				<div className="flex flex-wrap items-center gap-2.5">
					{level && (
						<Badge>
							English Level <b className="ml-1 text-ink">{LEVEL_CEFR[level]}</b>
						</Badge>
					)}
					{streak > 0 && <Badge dot="warn">{streak} day streak</Badge>}
				</div>
			</div>

			{!configured && (
				<div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-paper p-4 sm:p-5">
					<div className="flex items-center gap-3">
						<span className="size-2 flex-none rounded-full bg-accent" />
						<div>
							<p className="text-sm font-semibold text-ink">Set up your AI provider</p>
							<p className="text-sm text-muted">
								Connect your DeepSeek or GLM key to unlock conversations.
							</p>
						</div>
					</div>
					<Button to="/settings">Set up</Button>
				</div>
			)}

			<div className="mt-7 grid gap-6 lg:grid-cols-2">
				{recommendation ? (
					<div className="rounded-lg bg-paper p-6 shadow-sm ring-1 ring-line">
						<div className="flex items-start justify-between gap-3">
							<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
								{sessions.length > 0 ? "Today's recommendation" : "A good place to start"}
							</p>
							{sessions.length > 0 && (
								<Badge>
									<span className="size-[6px] rounded-full bg-accent" /> Focus
								</Badge>
							)}
						</div>
						<h2 className="mt-3 font-display text-[26px] font-semibold leading-[1.15] tracking-[-0.015em] text-ink">
							{recommendation.title}
						</h2>
						<p className="mt-2 text-sm leading-relaxed text-muted">
							{recommendation.aiRole} · {recommendation.objective}
						</p>
						<div className="mt-4 flex flex-wrap gap-2">
							<Badge>{recommendation.difficulty}</Badge>
							<Badge>{recommendation.durationMin} min</Badge>
							<Badge>{CATEGORIES.find((c) => c.id === recommendation.category)?.label}</Badge>
						</div>
						<div className="mt-5">
							<Button to={`/practice/${recommendation.id}/setup`}>Practice</Button>
						</div>
					</div>
				) : null}

				<div className="rounded-lg border border-line bg-paper p-6">
					<p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
						Your skills
					</p>
					{averages ? (
						<div className="flex flex-col gap-5">
							{DIMENSION_ORDER.map((d) => (
								<SkillBar key={d.key} label={d.label} value={averages[d.key]} />
							))}
						</div>
					) : (
						<div>
							<p className="text-sm text-ink-2">No skill scores yet.</p>
							<p className="mt-1 text-sm text-muted">
								Finish a conversation and your feedback will show up here.
							</p>
						</div>
					)}
					<Link
						to="/progress"
						className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-accent transition-colors hover:text-accent-dark"
					>
						View full progress
					</Link>
				</div>
			</div>

			<section className="mt-8">
				<div className="mb-3 flex items-center justify-between">
					<h2 className="font-display text-[22px] font-semibold tracking-[-0.015em] text-ink">
						Recent sessions
					</h2>
					<Link to="/history" className="text-sm font-semibold text-accent transition-colors hover:text-accent-dark">
						View history
					</Link>
				</div>
				{recent.length === 0 ? (
					<div className="rounded-lg border border-dashed border-line bg-paper">
						<EmptyState
							title="No practice sessions yet."
							body="Start your first conversation and your results will appear here."
						>
							<Button to="/practice">Start practicing</Button>
						</EmptyState>
					</div>
				) : (
					<div className="overflow-hidden rounded-lg border border-line bg-paper">
						{recent.map((session) => {
							const scenario = getScenario(session.scenarioId);
							return (
								<Link
									key={session.id}
									to={`/results/${session.id}`}
									className="flex items-center gap-4 border-b border-line-soft px-5 py-4 transition-colors hover:bg-surface-warm last:border-b-0"
								>
									<span className="grid size-8 flex-none place-items-center rounded-full bg-surface text-xs font-semibold text-ink-2">
										{scenario
											? scenario.title
													.split(/\s+/)
													.map((w) => w[0])
													.slice(0, 2)
													.join("")
													.toUpperCase()
											: "?"}
									</span>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-semibold text-ink">
											{scenario?.title ?? "Unknown scenario"}
										</p>
										<p className="mt-0.5 truncate text-sm text-muted">
											{scenario?.difficulty} · {formatDuration(session.startedAt, session.endedAt)} ·{" "}
											{formatRelative(session.endedAt)}
										</p>
									</div>
									<span className="font-mono text-sm font-semibold text-accent">
										{session.score}
									</span>
									<IconChevronRight className="size-[18px] flex-none text-meta" />
								</Link>
							);
						})}
					</div>
				)}
			</section>
		</AppShell>
	);
}
