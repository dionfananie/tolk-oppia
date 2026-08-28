type Props = {
	label: string;
	value: number;
};

export function SkillBar({ label, value }: Props) {
	return (
		<div className="skill">
			<div className="mb-2 flex items-baseline justify-between gap-3">
				<span className="text-sm font-semibold text-ink-2">{label}</span>
				<span className="font-mono text-sm font-semibold text-ink">{value}</span>
			</div>
			<div className="h-2 w-full overflow-hidden rounded-full bg-surface">
				<div
					className="h-full rounded-full bg-accent"
					style={{ width: `${value}%`, transition: "width 0.6s ease" }}
				/>
			</div>
		</div>
	);
}
