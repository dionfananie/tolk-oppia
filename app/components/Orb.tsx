export type OrbState = "idle" | "listening" | "speaking" | "processing" | "error";

const RING_COUNT: Record<OrbState, number> = {
	idle: 0,
	listening: 1,
	speaking: 3,
	processing: 1,
	error: 0,
};

const ANIMATION: Record<OrbState, string> = {
	idle: "animate-orb-idle",
	listening: "animate-orb-idle",
	speaking: "animate-orb-idle",
	processing: "animate-orb-idle",
	error: "",
};

type Props = {
	name: string;
	sub?: string;
	state: OrbState;
	className?: string;
};

export function Orb({ name, sub, state, className = "size-[clamp(150px,22vw,184px)]" }: Props) {
	const rings = Array.from({ length: RING_COUNT[state] });
	const animate =
		state === "listening" || state === "speaking" || state === "processing" || state === "idle"
			? ANIMATION[state]
			: "";
	const ringDelay =
		state === "speaking" ? ["", "[animation-delay:0.55s]", "[animation-delay:1.1s]"] : [""];

	return (
		<div
			className={`relative grid place-items-center overflow-hidden rounded-full bg-ink ${animate} ${className} ${
				state === "error" ? "shadow-[0_0_0_3px_color-mix(in_oklab,#dc2626_55%,transparent)]" : ""
			}`}
			role="img"
			aria-label={sub ? `${name}, ${sub}` : name}
		>
			{rings.map((_, index) => (
				<span
					key={index}
					aria-hidden="true"
					className={`absolute inset-0 rounded-full border border-ink/25 ${
						state === "listening" || state === "speaking" || state === "processing"
							? state === "processing"
								? "animate-ring-fast"
								: "animate-ring"
							: "opacity-0"
					} ${ringDelay[index] ?? ""}`}
				/>
			))}
			<div className="grid place-items-center gap-0.5">
				<span className="px-4 text-center font-display text-lg font-medium tracking-[0.04em] text-paper">
					{name}
				</span>
				{sub && (
					<span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-paper/60">
						{sub}
					</span>
				)}
			</div>
		</div>
	);
}
