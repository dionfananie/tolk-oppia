type Props = {
	value: number;
	size?: number;
	strokeWidth?: number;
	label?: string;
};

const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({ value, size = 150, strokeWidth = 10, label }: Props) {
	const dash = (CIRCUMFERENCE * Math.max(0, Math.min(100, value))) / 100;
	return (
		<div
			className="relative"
			style={{ width: size, height: size }}
			role="progressbar"
			aria-valuenow={value}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label={label ? `${value} out of 100, ${label}` : `${value} out of 100`}
		>
			<svg viewBox="0 0 100 100" className="size-full" aria-hidden="true">
				<circle
					cx="50"
					cy="50"
					r={RADIUS}
					fill="none"
					stroke="var(--color-surface)"
					strokeWidth={strokeWidth}
				/>
				<circle
					cx="50"
					cy="50"
					r={RADIUS}
					fill="none"
					stroke="var(--color-accent)"
					strokeWidth={strokeWidth}
					strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
					strokeLinecap="round"
					className="origin-center"
					style={{ transform: "rotate(-90deg)" }}
				/>
			</svg>
			<div className="absolute inset-0 grid place-content-center text-center">
				<span className="font-display text-3xl font-semibold tracking-[-0.015em] text-ink">
					{value}
				</span>
				{label && <span className="text-xs text-muted">{label}</span>}
			</div>
		</div>
	);
}
