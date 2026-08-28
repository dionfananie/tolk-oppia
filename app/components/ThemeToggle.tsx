import { useTheme } from "~/lib/theme";
import { IconMoon, IconSun } from "~/components/icons";

type Props = {
	className?: string;
};

export function ThemeToggle({ className = "" }: Props) {
	const { theme, toggle } = useTheme();
	const isDark = theme === "dark";
	return (
		<button
			type="button"
			onClick={toggle}
			aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
			className={`grid size-[44px] flex-none place-items-center rounded-lg border border-line bg-paper text-ink-2 transition-colors hover:bg-surface hover:text-ink focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper focus:outline-none ${className}`}
		>
			{isDark ? <IconSun className="size-5" /> : <IconMoon className="size-5" />}
		</button>
	);
}
