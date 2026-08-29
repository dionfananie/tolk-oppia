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
		<article className="card card-border bg-base-100">
			<div className="card-body p-6">
				<div className="flex items-start justify-between gap-3">
					{icon && (
						<span className="rounded-full bg-primary/10 p-2 text-primary">{icon}</span>
					)}
					{delta && (
						<span
							className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
								delta.direction === "up"
									? "bg-success/15 text-success"
									: delta.direction === "down"
										? "bg-error/15 text-error"
										: "bg-base-200 text-base-content/70"
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
					<p className="text-sm text-base-content/60">{label}</p>
					<p className="mt-1 font-display text-2xl font-semibold tracking-[-0.015em] text-base-content">{value}</p>
					{note && <p className="mt-1.5 text-xs text-base-content/60">{note}</p>}
				</div>
			</div>
		</article>
	);
}
