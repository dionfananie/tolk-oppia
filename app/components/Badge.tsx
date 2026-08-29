import type { ReactNode } from "react";

type DotTone = "accent" | "warn" | "danger" | "success" | "muted";

const DOT_TONES: Record<DotTone, string> = {
	accent: "bg-primary",
	warn: "bg-warning",
	danger: "bg-error",
	success: "bg-success",
	muted: "bg-base-300",
};

type Props = {
	children: ReactNode;
	dot?: DotTone;
};

export function Badge({ children, dot }: Props) {
	return (
		<span
			className={`badge badge-soft ${
				dot ? "badge-soft text-base-content" : "badge-soft text-base-content/70"
			}`}
		>
			{dot && <span className={`size-[6px] rounded-full ${DOT_TONES[dot]}`} />}
			{children}
		</span>
	);
}
