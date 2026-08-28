import { motion, MotionConfig } from "framer-motion";

export type OrbState = "idle" | "listening" | "speaking" | "processing" | "error";

const RING_COUNT: Record<OrbState, number> = {
	idle: 0,
	listening: 1,
	speaking: 3,
	processing: 1,
	error: 0,
};

const MOTION: Record<
	OrbState,
	{ scale: number | number[]; duration: number; repeat?: number }
> = {
	idle: { scale: [1, 1.02, 1], duration: 3.2, repeat: Infinity },
	listening: { scale: [1, 1.04, 1], duration: 1.15, repeat: Infinity },
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
	const ringDelay =
		state === "speaking" ? ["", "[animation-delay:0.55s]", "[animation-delay:1.1s]"] : [""];
	const animate =
		state === "listening" || state === "speaking" ? "animate-ring" : state === "processing" ? "animate-ring-fast" : "";
	const motionSpec = MOTION[state];

	return (
		<MotionConfig reducedMotion="user">
			<motion.div
				className={`relative grid place-items-center overflow-hidden rounded-full bg-ink ${className} ${
					state === "error" ? "shadow-[0_0_0_3px_color-mix(in_oklab,#ef5b5b_55%,transparent)]" : ""
				}`}
				role="img"
				aria-label={sub ? `${name}, ${sub}` : name}
				animate={{ scale: motionSpec.scale }}
				transition={{
					duration: motionSpec.duration,
					ease: "easeInOut",
					repeat: motionSpec.repeat ?? 0,
				}}
			>
				{rings.map((_, index) => (
					<span
						key={index}
						aria-hidden="true"
						className={`absolute inset-0 rounded-full border border-accent ${
							animate ? animate : "opacity-0"
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
			</motion.div>
		</MotionConfig>
	);
}
