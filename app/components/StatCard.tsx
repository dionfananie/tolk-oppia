import type { ReactNode } from "react";
import { IconTrendDown, IconTrendUp } from "~/components/icons";

type Delta = {
	value: string;
	direction: "up" | "down" | "flat";
};

type Props = {
	label: string;
	value: string;
	delta?: Delta;
	note?: string;
	icon?: ReactNode;
};

export function StatCard({ label, value, delta, note, icon }: Props) {
	return (
		<article className="rounded-lg border border-line bg-paper p-6">
			<div className="flex items-start justify-between gap-3">
				{icon && (
					<span className="rounded-full bg-accent/10 p-2 text-accent">{icon}</span>
				)}
				{delta && (
					<span
						className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium ${
							delta.direction === "up"
								? "bg-success/10 text-success"
								: delta.direction === "down"
									? "bg-danger/10 text-danger"
									: "bg-surface text-muted"
						}`}
					>
						{delta.direction === "up" ? (
							<IconTrendUp className="size-4" />
						) : delta.direction === "down" ? (
							<IconTrendDown className="size-4" />
						) : null}
						<span className="sr-only">
							{delta.direction === "up" ? "Increase" : delta.direction === "down" ? "Decrease" : "Unchanged"}
						</span>
						{delta.value}
					</span>
				)}
			</div>
			<div className="mt-4">
				<p className="text-sm text-muted">{label}</p>
				<p className="mt-1 font-display text-2xl font-medium tracking-[-0.015em] text-ink">{value}</p>
				{note && <p className="mt-1.5 text-xs text-muted">{note}</p>}
			</div>
		</article>
	);
}
