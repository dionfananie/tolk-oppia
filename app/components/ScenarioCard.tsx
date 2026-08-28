import { Link } from "react-router";
import type { CategoryId, Scenario } from "~/data/scenarios";
import {
	IconBriefcase,
	IconChat,
	IconInterview,
	IconList,
} from "~/components/icons";

const CATEGORY_ICONS: Record<CategoryId, (props: { className?: string }) => React.ReactNode> = {
	workplace: IconChat,
	business: IconBriefcase,
	career: IconInterview,
	professional: IconList,
};

type Props = {
	scenario: Scenario;
};

export function ScenarioCard({ scenario }: Props) {
	const Icon = CATEGORY_ICONS[scenario.category];
	return (
		<article className="flex flex-col gap-2 rounded-xl border border-line bg-paper p-6 transition hover:-translate-y-0.5 hover:border-line hover:shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
			<span className="mb-2 grid size-10 place-items-center rounded-full bg-surface text-ink-2">
				<Icon className="size-5" />
			</span>
			<h3 className="text-[19px] font-semibold leading-[1.2] text-ink">{scenario.title}</h3>
			<p className="text-sm leading-[1.45] text-muted">
				<span className="font-medium text-ink-2">{scenario.aiRole}</span> · {scenario.objective}
			</p>
			{scenario.targetVocabulary.length > 0 && (
				<div className="mt-1 flex flex-wrap gap-1.5">
					{scenario.targetVocabulary.slice(0, 3).map((word) => (
						<span
							key={word}
							className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted"
						>
							{word}
						</span>
					))}
				</div>
			)}
			<div className="mt-auto flex items-center justify-between gap-3 pt-4">
				<span className="text-xs font-semibold text-muted">
					{scenario.difficulty} · {scenario.durationMin} min
				</span>
				<Link
					to={`/practice/${scenario.id}/setup`}
					className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-paper transition hover:bg-accent-dark"
				>
					Practice
				</Link>
			</div>
		</article>
	);
}
