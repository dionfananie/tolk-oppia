import { useMemo, useState } from "react";
import type { Route } from "./+types/scenarios";
import { AppShell } from "~/components/AppShell";
import { ChipGroup } from "~/components/ChipGroup";
import { ScenarioCard } from "~/components/ScenarioCard";
import {
	CATEGORIES,
	getScenariosByCategory,
	type CategoryId,
} from "~/data/scenarios";

export function meta({}: Route.MetaArgs) {
	return [{ title: "What do you want to practice? · TOLK" }];
}

export default function Scenarios() {
	const [category, setCategory] = useState<CategoryId | "all">("all");

	const scenarios = useMemo(() => getScenariosByCategory(category), [category]);
	const filters: { value: CategoryId | "all"; label: string }[] = [
		{ value: "all", label: "All" },
		...CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
	];

	return (
		<AppShell active="practice">
			<div className="max-w-[620px]">
				<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
					Practice
				</p>
				<h1 className="mt-2 font-display text-[clamp(28px,3.4vw,40px)] font-semibold tracking-[-0.015em] text-ink">
					What do you want to practice?
				</h1>
				<p className="mt-3 text-muted">
					Pick a real work situation. The AI plays the other person, and you keep the
					conversation going.
				</p>
			</div>

			<div className="mt-8">
				<ChipGroup
					label="Filter scenarios"
					options={filters}
					value={category}
					onChange={(value) => setCategory(value as CategoryId | "all")}
				/>
			</div>

			{scenarios.length === 0 ? (
				<div className="mt-6 rounded-xl border border-dashed border-line bg-paper px-6 py-12 text-center">
					<p className="text-sm font-semibold text-ink-2">No scenarios in this category yet.</p>
					<p className="mt-1 text-sm text-muted">Try another filter to see more options.</p>
				</div>
			) : (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{scenarios.map((scenario) => (
						<ScenarioCard key={scenario.id} scenario={scenario} />
					))}
				</div>
			)}
		</AppShell>
	);
}
