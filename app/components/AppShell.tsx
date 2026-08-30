import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Brand } from "~/components/Brand";
import { Button } from "~/components/Button";
import { ThemeToggle } from "~/components/ThemeToggle";
import { googleLoginUrl, logout, useAuth } from "~/lib/auth";
import { IconChart, IconClock, IconList, IconMic, IconSliders, IconUser } from "~/components/icons";

export type NavKey = "dashboard" | "practice" | "progress" | "history" | "settings";

const NAV_ITEMS: {
	key: NavKey;
	label: string;
	to: string;
	icon: (props: { className?: string }) => React.ReactNode;
	authOnly?: boolean;
}[] = [
	{ key: "dashboard", label: "Dashboard", to: "/dashboard", icon: IconList, authOnly: true },
	{ key: "practice", label: "Practice", to: "/practice", icon: IconMic },
	{ key: "progress", label: "Progress", to: "/progress", icon: IconChart },
	{ key: "history", label: "History", to: "/history", icon: IconClock },
	{ key: "settings", label: "Settings", to: "/settings", icon: IconSliders },
];

type Props = {
	active: NavKey;
	children: ReactNode;
};

/** Dropdown akun di header: avatar (gambar/initial) yang saat diklik membuka menu.
 * Login → menu berisi Sign out. Belum login → menu berisi Sign in / Sign up.
 * Client-only; tutup saat klik di luar. */
function AccountMenu() {
	const { user, loading } = useAuth();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function onDocClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener("mousedown", onDocClick);
		return () => document.removeEventListener("mousedown", onDocClick);
	}, [open]);

	if (loading) {
		return <span className="hidden size-9 flex-none animate-pulse rounded-full bg-base-200 sm:block" aria-hidden />;
	}

	const returnTo = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";

	return (
		<div ref={ref} className="relative flex-none">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={user ? "Menu akun" : "Masuk atau buat akun"}
				className="grid size-[44px] place-items-center overflow-hidden rounded-full border border-base-300 bg-base-200 text-base-content/70 transition-colors hover:border-base-content/30 hover:text-base-content focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-base-100 focus:outline-none"
			>
				{user?.avatar_url ? (
					<img src={user.avatar_url} alt="" className="size-full object-cover" />
				) : (
					<IconUser className="size-6" />
				)}
			</button>

			{open && (
				<div
					role="menu"
					className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-base-300 bg-base-100 p-1.5 shadow-lg"
				>
					{user ? (
						<>
							<div className="px-3 py-2">
								<p className="truncate text-sm font-semibold text-base-content">
									{user.name || "Akun"}
								</p>
								{user.email && (
									<p className="truncate text-xs text-base-content/60">{user.email}</p>
								)}
							</div>
							<div className="my-1 h-px bg-base-200" />
							<button
								type="button"
								onClick={() => void logout()}
								role="menuitem"
								className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-error transition-colors hover:bg-error/10"
							>
								Sign out
							</button>
						</>
					) : (
						<>
							<a
								href={googleLoginUrl(returnTo)}
								role="menuitem"
								className="block w-full rounded-lg px-3 py-2 text-sm font-semibold text-base-content transition-colors hover:bg-base-200"
							>
								Sign in
							</a>
							<Link
								to="/signup"
								role="menuitem"
								onClick={() => setOpen(false)}
								className="block w-full rounded-lg px-3 py-2 text-sm font-semibold text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content"
							>
								Sign up
							</Link>
						</>
					)}
				</div>
			)}
		</div>
	);
}

export function AppShell({ active, children }: Props) {
	const { user } = useAuth();
	// Dashboard (authOnly) hanya muncul saat sudah login.
	const visibleNav = NAV_ITEMS.filter((item) => !item.authOnly || user);

	return (
		<div className="min-h-dvh bg-base-100 text-base-content">
			<header className="sticky top-0 z-[60] border-b border-base-300 bg-base-100/90 backdrop-blur">
				<div className="mx-auto flex h-14 max-w-[1024px] items-center gap-6 px-4 sm:px-6">
					<Brand to="/" />
					<nav aria-label="Primary" className="ml-4 hidden items-center gap-1 sm:flex">
						{visibleNav.map((item) => {
							const current = item.key === active;
							return (
								<Link
									key={item.key}
									to={item.to}
									aria-current={current ? "page" : undefined}
									className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
										current
											? "bg-primary/15 text-primary"
											: "text-base-content/70 hover:bg-base-200 hover:text-base-content"
									}`}
								>
									{item.label}
								</Link>
							);
						})}
					</nav>
					<div className="ml-auto flex items-center gap-2">
						<Button to="/practice">Start Practice</Button>
						<ThemeToggle />
						<AccountMenu />
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-[1024px] px-4 pb-24 pt-10 sm:px-6 sm:pb-16 md:pb-24">
				{children}
			</main>

			<nav
				aria-label="Primary"
				className={`fixed bottom-0 left-0 right-0 z-[60] grid border-t border-base-300 bg-base-100/90 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden ${
					visibleNav.length === 5 ? "grid-cols-5" : "grid-cols-4"
				}`}
			>
				{visibleNav.map((item) => {
					const current = item.key === active;
					return (
						<Link
							key={item.key}
							to={item.to}
							aria-current={current ? "page" : undefined}
							className={`flex flex-col items-center gap-0.5 px-2 pb-2.5 pt-2 text-[11px] font-semibold transition-colors ${
								current ? "text-primary" : "text-base-content/60"
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
