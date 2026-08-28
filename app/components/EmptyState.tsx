import type { ReactNode } from "react";
import { IconInbox } from "~/components/icons";

type Props = {
	icon?: ReactNode;
	title: string;
	body: string;
	children?: ReactNode;
	footer?: ReactNode;
};

export function EmptyState({ icon, title, body, children, footer }: Props) {
	return (
		<div className="mx-auto max-w-md py-12 text-center">
			{icon ?? <IconInbox className="mx-auto size-20 text-meta" />}
			<h2 className="mt-6 font-display text-2xl font-bold tracking-[-0.015em] text-ink">{title}</h2>
			<p className="mt-4 text-pretty text-muted">{body}</p>
			{children && <div className="mt-6 flex flex-col items-center gap-3">{children}</div>}
			{footer && <p className="mt-6 text-sm text-muted">{footer}</p>}
		</div>
	);
}
