export function formatDateTime(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function formatDuration(startIso: string, endIso: string): string {
	const start = new Date(startIso).getTime();
	const end = new Date(endIso).getTime();
	if (!Number.isFinite(start) || !Number.isFinite(end)) return "--";
	const seconds = Math.max(0, Math.round((end - start) / 1000));
	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	return `${minutes}m ${rest.toString().padStart(2, "0")}s`;
}

export function formatClock(totalSeconds: number): string {
	const seconds = Math.max(0, Math.floor(totalSeconds));
	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	return `${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
}

export function formatRelative(iso: string): string {
	const date = new Date(iso);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const minutes = Math.floor(diffMs / 60000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes} min ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days === 1) return "yesterday";
	if (days < 7) return `${days} days ago`;
	return formatDateTime(iso);
}
