import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/history";
import { AppShell } from "~/components/AppShell";
import { Button } from "~/components/Button";
import { ChipGroup } from "~/components/ChipGroup";
import { EmptyState } from "~/components/EmptyState";
import { IconChevronRight } from "~/components/icons";
import { getScenario, CATEGORIES, type CategoryId } from "~/data/scenarios";
import { deleteSession, getSessions, type Session } from "~/lib/storage";
import { formatDateTime, formatDuration } from "~/lib/format";

export function meta({}: Route.MetaArgs) {
	return [{ title: "History · TOLK" }];
}

export default function History() {
	const [sessions, setSessions] = useState<Session[]>([]);
	const [category, setCategory] = useState<CategoryId | "all">("all");

	useEffect(() => {
		setSessions(getSessions());
	}, []);

	const filtered = useMemo(() => {
		if (category === "all") return sessions;
		return sessions.filter((s) => getScenario(s.scenarioId)?.category === category);
	}, [sessions, category]);

	function remove(id: string) {
		deleteSession(id);
		setSessions(getSessions());
	}

	const filters: { value: CategoryId | "all"; label: string }[] = [
		{ value: "all", label: "All" },
		...CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
	];

	return (
		<AppShell active="history">
			<div className="max-w-[620px]">
				<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
					History
				</p>
				<h1 className="mt-2 font-display text-[clamp(28px,3.4vw,40px)] font-semibold tracking-[-0.015em] text-ink">
					Past sessions
				</h1>
				<p className="mt-3 text-muted">
					Every session, replayable. Open one to review its feedback and transcript.
				</p>
			</div>

			<div className="mt-6">
				<ChipGroup
					label="Filter sessions"
					options={filters}
					value={category}
					onChange={(value) => setCategory(value as CategoryId | "all")}
				/>
			</div>

			{sessions.length === 0 ? (
				<div className="mt-6 rounded-lg border border-dashed border-line bg-paper">
					<EmptyState
						title="No practice sessions yet."
						body="Complete your first practice conversation and its feedback will show up here."
					>
						<Button to="/practice">Start practicing</Button>
					</EmptyState>
				</div>
			) : filtered.length === 0 ? (
				<div className="mt-6 rounded-lg border border-dashed border-line bg-paper">
					<EmptyState title="No sessions in this category." body="Try another filter." />
				</div>
			) : (
				<div className="mt-6 overflow-hidden rounded-lg border border-line bg-paper">
					{filtered.map((session) => {
						const scenario = getScenario(session.scenarioId);
						return (
							<div
								key={session.id}
								className="flex items-center gap-4 border-b border-line-soft px-5 py-4 last:border-b-0"
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
								<Link to={`/results/${session.id}`} className="group flex min-w-0 flex-1 items-center gap-4">
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-semibold text-ink transition-colors group-hover:text-accent-dark">
											{scenario?.title ?? "Unknown scenario"}
										</p>
										<p className="mt-0.5 truncate text-sm text-muted">
											{scenario?.difficulty} · {formatDuration(session.startedAt, session.endedAt)} ·{" "}
											{formatDateTime(session.endedAt)}
										</p>
									</div>
									<span className="font-mono text-sm font-semibold text-accent">{session.score}</span>
									<IconChevronRight className="size-[18px] flex-none text-meta" />
								</Link>
								<button
									type="button"
									onClick={() => remove(session.id)}
									aria-label="Delete session"
									className="grid size-[36px] flex-none place-items-center rounded-lg text-meta transition-colors hover:bg-danger/10 hover:text-danger focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper focus:outline-none"
								>
									<svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
										<path d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						);
					})}
				</div>
			)}
		</AppShell>
	);
}
