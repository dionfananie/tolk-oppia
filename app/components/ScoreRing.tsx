type Props = {
	value: number;
	size?: number;
	strokeWidth?: number;
	label?: string;
};

export function ScoreRing({ value, size = 150, strokeWidth = 10, label }: Props) {
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference * (1 - value / 100);
	const numSize = size * 0.24;
	const capSize = size * 0.075;

	return (
		<div
			className="relative inline-flex items-center justify-center"
			style={{ width: size, height: size }}
			role="img"
			aria-label={label ? `${value} out of 100, ${label}` : `${value} out of 100`}
		>
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					stroke="var(--color-surface)"
					strokeWidth={strokeWidth}
				/>
				<g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
					<circle
						cx={size / 2}
						cy={size / 2}
						r={radius}
						fill="none"
						stroke="var(--color-accent)"
						strokeWidth={strokeWidth}
						strokeLinecap="round"
						strokeDasharray={circumference}
						strokeDashoffset={offset}
						style={{ transition: "stroke-dashoffset 0.9s ease" }}
					/>
				</g>
			</svg>
			<div className="absolute text-center">
				<p
					className="font-display font-semibold text-ink"
					style={{ fontSize: numSize, lineHeight: 1.1 }}
				>
					{value}
				</p>
				{label && (
					<p
						className="font-mono font-semibold tracking-[0.1em] text-muted"
						style={{ fontSize: capSize }}
					>
						{label}
					</p>
				)}
			</div>
		</div>
	);
}
