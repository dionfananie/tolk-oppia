import type { ReactNode } from "react";
import { Link } from "react-router";
import { Brand } from "~/components/Brand";
import { ThemeToggle } from "~/components/ThemeToggle";

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
				<div className="mx-auto flex h-14 max-w-[1024px] items-center justify-between gap-4 px-4 sm:px-6">
					<Brand to="/" />
					<div className="flex items-center gap-2">
						<ThemeToggle />
						<Link
							to={asideHref}
							className="inline-flex min-h-[44px] items-center rounded-lg px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
						>
							{asideLabel}
						</Link>
					</div>
				</div>
			</header>
			<main className="grid min-h-[calc(100dvh-56px)] place-items-center px-4 py-12">
				<div className="w-full max-w-[420px] rounded-lg border border-line bg-paper p-8">
					<h1 className="font-display text-[28px] font-semibold tracking-[-0.015em] text-ink">
						{title}
					</h1>
					<p className="mt-2 text-muted">{sub}</p>
					{children}
					<p className="mt-6 text-center text-sm text-muted">
						{altText}{" "}
						<Link to={altHref} className="font-semibold text-accent transition-colors hover:text-accent-dark">
							{altLink}
						</Link>
					</p>
				</div>
			</main>
		</div>
	);
}
