type Props = {
	label: string;
	value: number;
};

function barColor(value: number): string {
	if (value >= 80) return "bg-success";
	if (value >= 60) return "bg-warning";
	return "bg-error";
}

export function ScoreBar({ label, value }: Props) {
	return (
		<div>
			<div className="mb-1 flex items-baseline justify-between">
				<span className="text-sm font-medium capitalize text-base-content/70">{label}</span>
				<span className="text-sm font-semibold text-base-content">{value}</span>
			</div>
			<div className="h-2.5 w-full overflow-hidden rounded-full bg-base-300">
				<div
					className={`h-full rounded-full ${barColor(value)}`}
					style={{ width: `${value}%`, transition: "width 0.6s ease" }}
				/>
			</div>
		</div>
	);
}
