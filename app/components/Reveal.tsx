import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = {
	children: ReactNode;
	className?: string;
	delay?: number;
};

export function Reveal({ children, className, delay = 0 }: RevealProps) {
	return (
		<motion.div
			className={className}
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-60px" }}
			transition={{ duration: 0.55, ease: "easeOut", delay }}
		>
			{children}
		</motion.div>
	);
}

const item: Variants = {
	hidden: { opacity: 0, y: 20 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.5, ease: "easeOut" },
	},
};

export function RevealGroup({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<motion.div
			className={className}
			initial="hidden"
			whileInView="show"
			viewport={{ once: true, margin: "-60px" }}
			variants={{ show: { transition: { staggerChildren: 0.08 } } }}
		>
			{children}
		</motion.div>
	);
}

export function RevealItem({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<motion.div className={className} variants={item}>
			{children}
		</motion.div>
	);
}
