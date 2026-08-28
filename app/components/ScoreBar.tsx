type Props = {
	label: string;
	value: number;
};

function barColor(value: number): string {
	if (value >= 80) return "bg-emerald-500";
	if (value >= 60) return "bg-amber-500";
	return "bg-red-500";
}

export function ScoreBar({ label, value }: Props) {
	return (
		<div>
			<div className="mb-1 flex items-baseline justify-between">
				<span className="text-sm font-medium capitalize text-slate-700">{label}</span>
				<span className="text-sm font-semibold text-slate-900">{value}</span>
			</div>
			<div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
				<div
					className={`h-full rounded-full ${barColor(value)}`}
					style={{ width: `${value}%`, transition: "width 0.6s ease" }}
				/>
			</div>
		</div>
	);
}
