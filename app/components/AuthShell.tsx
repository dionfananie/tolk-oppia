import type { ReactNode } from "react";
import { Link } from "react-router";
import { Brand } from "~/components/Brand";

type Props = {
	title: string;
	sub: string;
	children: ReactNode;
	asideHref: string;
	asideLabel: string;
	altText: string;
	altHref: string;
	altLink: string;
};

export function AuthShell({
	title,
	sub,
	children,
	asideHref,
	asideLabel,
	altText,
	altHref,
	altLink,
}: Props) {
	return (
		<div className="min-h-dvh bg-surface text-ink">
			<header className="border-b border-line-soft bg-paper">
				<div className="mx-auto flex h-14 max-w-[1024px] items-center justify-between px-4 sm:px-6">
					<Brand to="/" />
					<Link
						to={asideHref}
						className="rounded-full px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/10"
					>
						{asideLabel}
					</Link>
				</div>
			</header>
			<main className="grid min-h-[calc(100dvh-56px)] place-items-center px-4 py-12">
				<div className="w-full max-w-[420px] rounded-xl bg-paper p-8 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
					<h1 className="font-display text-[28px] font-semibold tracking-[-0.015em] text-ink">
						{title}
					</h1>
					<p className="mt-2 text-muted">{sub}</p>
					{children}
					<p className="mt-6 text-center text-sm text-muted">
						{altText}{" "}
						<Link to={altHref} className="font-semibold text-accent transition hover:text-accent-dark">
							{altLink}
						</Link>
					</p>
				</div>
			</main>
		</div>
	);
}
