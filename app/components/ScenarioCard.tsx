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
		<article className="card card-border bg-base-100 transition-transform hover:-translate-y-1">
			<div className="card-body gap-2">
				<span className="mb-2 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
					<Icon className="size-5" />
				</span>
				<h3 className="card-title">{scenario.title}</h3>
				<p className="text-sm leading-[1.45] text-base-content/70">
					<span className="font-medium text-base-content">{scenario.aiRole}</span> · {scenario.objective}
				</p>
				{scenario.targetVocabulary.length > 0 && (
					<div className="mt-1 flex flex-wrap gap-1.5">
						{scenario.targetVocabulary.slice(0, 3).map((word) => (
							<span
								key={word}
								className="badge badge-soft badge-lg"
							>
								{word}
							</span>
						))}
					</div>
				)}
				<div className="mt-auto flex items-center justify-between gap-3 pt-3">
					<span className="text-xs font-medium text-base-content/60">
						{scenario.difficulty} · {scenario.durationMin} min
					</span>
					<Button to={`/practice/${scenario.id}/setup`} size="sm">
						Practice
					</Button>
				</div>
			</div>
		</article>
	);
}
