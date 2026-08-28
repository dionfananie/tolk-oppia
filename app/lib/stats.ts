import { SCENARIOS, getScenario, type EnglishLevel, type Scenario } from "~/data/scenarios";
import type { Session } from "~/lib/storage";
import type { FeedbackScores } from "~/lib/feedback";

export const LEVEL_CEFR: Record<EnglishLevel, string> = {
	beginner: "A2",
	intermediate: "B1",
	advanced: "C1",
};

const DIMENSION_KEYS: (keyof FeedbackScores)[] = [
	"fluency",
	"grammar",
	"vocabulary",
	"clarity",
	"professionalism",
];

function dayKey(date: Date): string {
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function currentStreak(sessions: Session[]): number {
	if (sessions.length === 0) return 0;
	const days = new Set(sessions.map((s) => dayKey(new Date(s.endedAt))));
	const cursor = new Date();
	if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
	let streak = 0;
	while (days.has(dayKey(cursor))) {
		streak += 1;
		cursor.setDate(cursor.getDate() - 1);
	}
	return streak;
}

export function bestStreak(sessions: Session[]): number {
	const days = [...new Set(sessions.map((s) => dayKey(new Date(s.endedAt))))].sort();
	let best = 0;
	let run = 0;
	let prev: string | null = null;
	for (const day of days) {
		if (prev) {
			const gap = (new Date(day).getTime() - new Date(prev).getTime()) / 86400000;
			run = gap === 1 ? run + 1 : 1;
		} else {
			run = 1;
		}
		best = Math.max(best, run);
		prev = day;
	}
	return best;
}

export function totalMinutes(sessions: Session[]): number {
	let seconds = 0;
	for (const s of sessions) {
		const start = new Date(s.startedAt).getTime();
		const end = new Date(s.endedAt).getTime();
		if (Number.isFinite(start) && Number.isFinite(end)) seconds += Math.max(0, end - start) / 1000;
	}
	return Math.round(seconds / 60);
}

function scored(sessions: Session[]): Session[] {
	return sessions.filter((s) => s.feedback);
}

export function averageScores(sessions: Session[]): FeedbackScores | null {
	const withFeedback = scored(sessions);
	if (withFeedback.length === 0) return null;
	const totals: FeedbackScores = {
		fluency: 0,
		grammar: 0,
		vocabulary: 0,
		clarity: 0,
		professionalism: 0,
	};
	for (const s of withFeedback) {
		if (!s.feedback) continue;
		for (const key of DIMENSION_KEYS) totals[key] += s.feedback.scores[key];
	}
	const out = {} as FeedbackScores;
	for (const key of DIMENSION_KEYS) out[key] = Math.round(totals[key] / withFeedback.length);
	return out;
}

export function averageOverall(sessions: Session[]): number | null {
	const withFeedback = scored(sessions);
	if (withFeedback.length === 0) return null;
	return Math.round(
		withFeedback.reduce((sum, s) => sum + s.score, 0) / withFeedback.length,
	);
}

export type DimensionDelta = {
	key: keyof FeedbackScores;
	label: string;
	previous: number;
	current: number;
	delta: number;
	note: string;
};

const DIMENSION_NOTES: Record<keyof FeedbackScores, string> = {
	fluency: "Faster, smoother turns with fewer hesitations.",
	grammar: "Tense consistency and sentence structure.",
	vocabulary: "Precision and range of word choice.",
	clarity: "How easily your message is understood.",
	professionalism: "Tone, politeness, and workplace register.",
};

export function scoreDeltas(sessions: Session[]): DimensionDelta[] {
	const withFeedback = scored(sessions);
	if (withFeedback.length < 2) return [];
	const recent = withFeedback.slice(0, Math.ceil(withFeedback.length / 2));
	const earlier = withFeedback.slice(Math.ceil(withFeedback.length / 2));
	const a = averageScores(recent);
	const b = averageScores(earlier);
	if (!a || !b) return [];
	return DIMENSION_KEYS.map((key) => {
		const current = a[key];
		const previous = b[key];
		return {
			key,
			label: key === "professionalism" ? "Professional" : key.charAt(0).toUpperCase() + key.slice(1),
			previous,
			current,
			delta: current - previous,
			note: DIMENSION_NOTES[key],
		};
	});
}

const WEAKEST_TO_CATEGORY: Record<keyof FeedbackScores, Scenario["category"]> = {
	fluency: "workplace",
	grammar: "workplace",
	vocabulary: "business",
	clarity: "workplace",
	professionalism: "professional",
};

export function recommendScenario(sessions: Session[]): Scenario | null {
	const withFeedback = scored(sessions);
	if (withFeedback.length === 0) return getScenario("disagreeing-politely") ?? null;

	const averages = averageScores(withFeedback);
	if (!averages) return null;
	const weakest = DIMENSION_KEYS.reduce((a, b) => (averages[a] <= averages[b] ? a : b));
	const category = WEAKEST_TO_CATEGORY[weakest];
	const practicedIds = new Set(sessions.map((s) => s.scenarioId));
	const candidates = SCENARIOS.filter((s) => s.category === category && !practicedIds.has(s.id));
	const pool = candidates.length > 0 ? candidates : SCENARIOS.filter((s) => s.category === category);
	return pool[0] ?? null;
}

export function wordsUsedInSessions(sessions: Session[]): Set<string> {
	const used = new Set<string>();
	for (const s of sessions) {
		for (const m of s.messages) {
			if (m.role !== "user") continue;
			const words = m.content.toLowerCase().match(/[a-z][a-z'-]*/g) ?? [];
			for (const w of words) used.add(w);
		}
	}
	return used;
}
