type Props = {
	label: string;
	value: number;
};

export function SkillBar({ label, value }: Props) {
	return (
		<div
			role="progressbar"
			aria-valuenow={value}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label={label}
		>
			<div className="flex justify-between gap-4">
				<span className="text-sm font-medium text-ink">{label}</span>
				<span className="text-sm font-medium text-ink">{value}</span>
			</div>
			<div className="mt-2 h-2 w-full rounded-full bg-surface">
				<div
					className="h-full rounded-full bg-accent"
					style={{ width: `${value}%`, transition: "width 0.6s ease" }}
				/>
			</div>
		</div>
	);
}
