import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/vocabulary";
import { AppShell } from "~/components/AppShell";
import { Badge } from "~/components/Badge";
import { Button } from "~/components/Button";
import { ChipGroup } from "~/components/ChipGroup";
import { EmptyState } from "~/components/EmptyState";
import { IconReplay } from "~/components/icons";
import { CATEGORIES, type CategoryId } from "~/data/scenarios";
import { searchVocabulary, type VocabEntry } from "~/data/vocabulary";
import { getSessions, type Session } from "~/lib/storage";
import { inputClass } from "~/lib/ui";

export function meta({}: Route.MetaArgs) {
	return [{ title: "Words to learn · TOLK" }];
}

function speak(text: string) {
	if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
	window.speechSynthesis.cancel();
	const utterance = new SpeechSynthesisUtterance(text);
	utterance.rate = 0.9;
	window.speechSynthesis.speak(utterance);
}

export default function Vocabulary() {
	const [sessions, setSessions] = useState<Session[]>([]);
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState<CategoryId | "all">("all");

	useEffect(() => {
		setSessions(getSessions());
	}, []);

	const entries = useMemo(() => searchVocabulary(query, category), [query, category]);

	const filters: { value: CategoryId | "all"; label: string }[] = [
		{ value: "all", label: "All" },
		...CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
	];

	function usage(entry: VocabEntry): { count: number; used: boolean } {
		const escaped = entry.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const re = new RegExp(`\\b${escaped}\\b`, "i");
		const count = sessions.filter((s) =>
			s.messages.some((m) => m.role === "user" && re.test(m.content)),
		).length;
		return { count, used: count > 0 };
	}

	return (
		<AppShell active="practice">
			<div className="max-w-[620px]">
				<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
					Vocabulary
				</p>
				<h1 className="mt-2 font-display text-[clamp(28px,3.4vw,40px)] font-semibold tracking-[-0.015em] text-ink">
					Words to learn
				</h1>
				<p className="mt-3 text-muted">
					The target words from your practice scenarios, each with a definition and a real example.
				</p>
			</div>

			<div className="mt-6 max-w-[420px]">
				<input
					type="search"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search words…"
					aria-label="Search words"
					className={inputClass}
				/>
			</div>

			<div className="mt-4">
				<ChipGroup
					label="Filter vocabulary"
					options={filters}
					value={category}
					onChange={(value) => setCategory(value as CategoryId | "all")}
				/>
			</div>

			{entries.length === 0 ? (
				<div className="mt-6 rounded-lg border border-dashed border-line bg-paper">
					<EmptyState title="No words match." body="Try a different search or filter." />
				</div>
			) : (
				<div className="mt-6 grid gap-4 sm:grid-cols-2">
					{entries.map((entry) => {
						const { count, used: wasUsed } = usage(entry);
						return (
							<article key={entry.word} className="flex flex-col rounded-lg border border-line bg-paper p-6">
								<div className="flex items-start justify-between gap-3">
									<div>
										<h3 className="font-display text-[22px] font-semibold tracking-[-0.015em] text-ink">
											{entry.word}
										</h3>
										<Badge>{entry.partOfSpeech}</Badge>
									</div>
									<Badge dot={wasUsed ? "success" : undefined}>
										{wasUsed
											? `Used in ${count} ${count === 1 ? "session" : "sessions"}`
											: "Not practiced yet"}
									</Badge>
								</div>
								<p className="mt-3.5 text-sm leading-[1.45] text-muted">{entry.definition}</p>
								<p className="mt-2.5 font-mono text-[13px] text-muted">&ldquo;{entry.example}&rdquo;</p>
								<div className="mt-4 flex gap-3">
									<Button variant="secondary" size="sm" onClick={() => speak(`${entry.word}. ${entry.example}`)}>
										<IconReplay className="size-4" />
										Listen
									</Button>
									<Button size="sm" to="/practice">
										Practice
									</Button>
								</div>
							</article>
						);
					})}
				</div>
			)}
		</AppShell>
	);
}
