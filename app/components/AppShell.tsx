import type { ReactNode } from "react";
import { Link } from "react-router";
import { Brand } from "~/components/Brand";
import { IconChart, IconClock, IconMic, IconSliders } from "~/components/icons";

export type NavKey = "dashboard" | "practice" | "progress" | "history" | "settings";

const NAV_ITEMS: {
	key: NavKey;
	label: string;
	to: string;
	icon: (props: { className?: string }) => React.ReactNode;
}[] = [
	{ key: "practice", label: "Practice", to: "/practice", icon: IconMic },
	{ key: "progress", label: "Progress", to: "/progress", icon: IconChart },
	{ key: "history", label: "History", to: "/history", icon: IconClock },
	{ key: "settings", label: "Settings", to: "/settings", icon: IconSliders },
];

type Props = {
	active: NavKey;
	children: ReactNode;
};

export function AppShell({ active, children }: Props) {
	return (
		<div className="min-h-dvh bg-paper text-ink">
			<header className="sticky top-0 z-[60] border-b border-line-soft bg-paper/85 backdrop-blur">
				<div className="mx-auto flex h-14 max-w-[1024px] items-center gap-6 px-4 sm:px-6">
					<Brand to="/app" />
					<nav aria-label="Primary" className="ml-4 hidden items-center gap-1 sm:flex">
						{NAV_ITEMS.map((item) => {
							const current = item.key === active;
							return (
								<Link
									key={item.key}
									to={item.to}
									aria-current={current ? "page" : undefined}
									className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${
										current
											? "bg-surface text-ink"
											: "text-ink-2 hover:bg-surface hover:text-ink"
									}`}
								>
									{item.label}
								</Link>
							);
						})}
					</nav>
					<div className="ml-auto">
						<Link
							to="/practice"
							className="inline-flex min-h-[38px] items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-paper transition hover:bg-accent-dark"
						>
							Start Practice
						</Link>
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-[1024px] px-4 pb-24 pt-10 sm:px-6 sm:pb-16 md:pb-24">
				{children}
			</main>

			<nav
				aria-label="Primary"
				className="fixed bottom-0 left-0 right-0 z-[60] grid grid-cols-4 border-t border-line-soft bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
			>
				{NAV_ITEMS.map((item) => {
					const current = item.key === active;
					return (
						<Link
							key={item.key}
							to={item.to}
							aria-current={current ? "page" : undefined}
							className={`flex flex-col items-center gap-0.5 px-2 pb-2.5 pt-2 text-[11px] font-semibold transition ${
								current ? "text-accent" : "text-muted"
							}`}
						>
							<item.icon className="size-[22px]" />
							{item.label}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}
