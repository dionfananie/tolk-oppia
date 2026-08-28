import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const THEME_KEY = "tolk-oppia.theme";

export function getInitialTheme(): Theme {
	if (typeof window === "undefined") return "light";
	try {
		const stored = window.localStorage.getItem(THEME_KEY);
		if (stored === "light" || stored === "dark") return stored;
	} catch {
		// storage unavailable
	}
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
	if (typeof document === "undefined") return;
	document.documentElement.classList.toggle("dark", theme === "dark");
	try {
		window.localStorage.setItem(THEME_KEY, theme);
	} catch {
		// storage unavailable
	}
}

export function useTheme(): { theme: Theme; toggle: () => void } {
	const [theme, setTheme] = useState<Theme>("light");

	useEffect(() => {
		const initial = getInitialTheme();
		setTheme(initial);
		applyTheme(initial);
	}, []);

	return {
		theme,
		toggle: () => {
			setTheme((current) => {
				const next = current === "dark" ? "light" : "dark";
				applyTheme(next);
				return next;
			});
		},
	};
}
