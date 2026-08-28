type IconProps = {
	className?: string;
};

function base(className?: string) {
	return `block ${className ?? "size-4"}`;
}

export function IconMic({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={base(className)}>
			<rect x="9" y="2" width="6" height="12" rx="3" />
			<path d="M5 11a7 7 0 0 0 14 0" />
			<path d="M12 18v4" />
		</svg>
	);
}

export function IconChart({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className={base(className)}>
			<path d="M4 20v-6" />
			<path d="M10 20V8" />
			<path d="M16 20v-10" />
			<path d="M22 20H2" />
		</svg>
	);
}

export function IconClock({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={base(className)}>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7v5l3 2" />
		</svg>
	);
}

export function IconSliders({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className={base(className)}>
			<path d="M4 6h16" />
			<circle cx="9" cy="6" r="2" />
			<path d="M4 12h16" />
			<circle cx="15" cy="12" r="2" />
			<path d="M4 18h16" />
			<circle cx="7" cy="18" r="2" />
		</svg>
	);
}

export function IconChat({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={base(className)}>
			<path d="M4 5h16v10H7l-3 3z" />
			<path d="M8 15h8" />
		</svg>
	);
}

export function IconBriefcase({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={base(className)}>
			<path d="M5 8h14v11H5z" />
			<path d="M8 8V6a4 4 0 0 1 8 0v2" />
			<path d="M2 12h20" />
		</svg>
	);
}

export function IconInterview({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={base(className)}>
			<path d="M12 3a5 5 0 0 1 5 5v3" />
			<rect x="4" y="11" width="16" height="9" rx="3" />
			<circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
		</svg>
	);
}

export function IconList({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className={base(className)}>
			<path d="M9 7h11" />
			<path d="M9 12h11" />
			<path d="M9 17h11" />
			<circle cx="4.5" cy="7" r="1.5" fill="currentColor" stroke="none" />
			<circle cx="4.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
			<circle cx="4.5" cy="17" r="1.5" fill="currentColor" stroke="none" />
		</svg>
	);
}

export function IconReplay({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={base(className)}>
			<path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
			<path d="M3 3v5h5" />
		</svg>
	);
}

export function IconChevronRight({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={base(className)}>
			<path d="M9 6l6 6-6 6" />
		</svg>
	);
}

export function IconArrowUp({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={base(className)}>
			<path d="M12 19V5" />
			<path d="m5 12 7-7 7 7" />
		</svg>
	);
}

export function IconArrowLeft({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={base(className)}>
			<path d="M15 18l-6-6 6-6" />
		</svg>
	);
}

export function IconCheck({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={base(className)}>
			<path d="M5 13l4 4L19 7" />
		</svg>
	);
}

export function IconSend({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={base(className)}>
			<path d="M12 19V5" />
			<path d="m5 12 7-7 7 7" />
		</svg>
	);
}
