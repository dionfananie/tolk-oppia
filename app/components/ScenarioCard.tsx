import type { CategoryId, Scenario } from "~/data/scenarios";
import { Button } from "~/components/Button";
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
		<article className="flex flex-col gap-2 rounded-lg border border-line bg-paper p-6 transition-shadow hover:shadow-sm">
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
							className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted"
						>
							{word}
						</span>
					))}
				</div>
			)}
			<div className="mt-auto flex items-center justify-between gap-3 pt-4">
				<span className="text-xs font-medium text-muted">
					{scenario.difficulty} · {scenario.durationMin} min
				</span>
				<Button to={`/practice/${scenario.id}/setup`} size="sm">
					Practice
				</Button>
			</div>
		</article>
	);
}
