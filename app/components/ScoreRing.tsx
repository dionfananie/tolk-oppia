import type { CSSProperties } from "react";

type Props = {
	value: number;
	size?: number;
	strokeWidth?: number;
	label?: string;
};

export function ScoreRing({ value, size = 150, strokeWidth = 10, label }: Props) {
	const clamped = Math.max(0, Math.min(100, value));
	return (
		<div
			className="radial-progress text-primary"
			style={
				{
					"--value": clamped,
					"--size": `${size}px`,
					"--thickness": `${strokeWidth}px`,
				} as CSSProperties
			}
			role="progressbar"
			aria-valuenow={clamped}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label={label ? `${value} out of 100, ${label}` : `${value} out of 100`}
		>
			<span className="font-display text-2xl font-semibold tracking-[-0.015em] text-base-content">
				{value}
			</span>
			{label && (
				<span className="-mt-2 block text-xs text-base-content/60">{label}</span>
			)}
		</div>
	);
}
