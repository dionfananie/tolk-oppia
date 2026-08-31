import { motion, MotionConfig } from "framer-motion";

export type OrbState = "idle" | "listening" | "speaking" | "processing" | "error";

const RING_COUNT: Record<OrbState, number> = {
	idle: 0,
	listening: 0,
	speaking: 3,
	processing: 0,
	error: 0,
};

const MOTION: Record<
	OrbState,
	{ scale: number | number[]; duration: number; repeat?: number }
> = {
	idle: { scale: 1, duration: 0.25 },
	listening: { scale: 1, duration: 0.25 },
	speaking: { scale: [1, 1.07, 1], duration: 0.9, repeat: Infinity },
	processing: { scale: 1, duration: 0.3 },
	error: { scale: 1, duration: 0.3 },
};

type Props = {
	name: string;
	sub?: string;
	state: OrbState;
	className?: string;
};

export function Orb({ name, sub, state, className = "size-[clamp(150px,22vw,184px)]" }: Props) {
	const rings = Array.from({ length: RING_COUNT[state] });
	const ringDelay = ["", "[animation-delay:0.55s]", "[animation-delay:1.1s]"];
	const motionSpec = MOTION[state];

	return (
		<MotionConfig reducedMotion="user">
			<div
				className={`relative grid place-items-center ${className}`}
				role="img"
				aria-label={sub ? `${name}, ${sub}` : name}
			>
				{rings.map((_, index) => (
					<span
						key={index}
						aria-hidden="true"
						className={`pointer-events-none absolute inset-0 rounded-full border-2 border-primary/55 animate-ring ${ringDelay[index] ?? ""}`}
					/>
				))}
				<motion.div
					className={`relative z-10 grid size-full place-items-center overflow-hidden rounded-full bg-primary text-primary-content ${
						state === "error" ? "shadow-[0_0_0_3px_color-mix(in_oklab,#ef5b5b_55%,transparent)]" : ""
					}`}
					animate={{ scale: motionSpec.scale }}
					transition={{
						duration: motionSpec.duration,
						ease: "easeInOut",
						repeat: motionSpec.repeat ?? 0,
					}}
				>
					<div className="grid place-items-center gap-0.5">
						<span className="px-4 text-center font-display text-lg font-medium tracking-[0.04em]">
							{name}
						</span>
						{sub && (
							<span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
								{sub}
							</span>
						)}
					</div>
				</motion.div>
			</div>
		</MotionConfig>
	);
}
