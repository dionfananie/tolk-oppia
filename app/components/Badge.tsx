import type { ReactNode } from "react";

type DotTone = "accent" | "warn" | "danger" | "success" | "muted";

const DOT_TONES: Record<DotTone, string> = {
	accent: "bg-accent",
	warn: "bg-warn",
	danger: "bg-danger",
	success: "bg-success",
	muted: "bg-meta",
};

type Props = {
	children: ReactNode;
	dot?: DotTone;
};

export function Badge({ children, dot }: Props) {
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
				dot ? "bg-surface text-ink-2" : "bg-surface text-muted"
			}`}
		>
			{dot && <span className={`size-[6px] rounded-full ${DOT_TONES[dot]}`} />}
			{children}
		</span>
	);
}
