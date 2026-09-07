// transcripts.ts — Ready transcripts for "ready transcript" practice mode.
// A ready transcript is a fixed, alternating conversation between the AI (the
// interviewer / other role) and the user. When the user picks ready mode, the
// AI only delivers the next assistant turn — it never improvises during the
// session. Uploaded documents may personalize only the *user* turns.

export type TranscriptRole = "assistant" | "user";

export type TranscriptTurn = {
	role: TranscriptRole;
	text: string;
};

export type TranscriptId = "job-interview" | "self-introduction" | "one-on-one";

export type ReadyTranscript = {
	id: TranscriptId;
	/** Scenario id this ready transcript is offered for. */
	scenarioId: string;
	title: string;
	description: string;
	turns: TranscriptTurn[];
};

// ── Built-in ready transcripts ────────────────────────────────────────────
// Role-neutral: the UI labels each speaker from the scenario's aiRole/userRole.
// Interviews/1-on-1 lines are written to draw the user's real answers, so the
// user's lines are cues rather than fully scripted dialogue.
export const READY_TRANSCRIPTS: ReadyTranscript[] = [
	{
		id: "job-interview",
		scenarioId: "job-interview",
		title: "Job interview",
		description:
			"A full mock interview: screening questions, behavioral questions, and a chance for you to ask something back.",
		turns: [
			{
				role: "assistant",
				text: "Thanks for making time today. Let's start with a quick introduction — could you walk me through your background and what you're looking for in your next role?",
			},
			{
				role: "user",
				text: "Introduce yourself: your experience, your current role, and the kind of role you are looking for.",
			},
			{
				role: "assistant",
				text: "Nice. I'd like to hear about a real challenge you faced in your recent work. Tell me what happened and what your responsibility was in solving it.",
			},
			{
				role: "user",
				text: "Describe one concrete challenge, your responsibility in it, and the result you delivered.",
			},
			{
				role: "assistant",
				text: "That's exactly the kind of example I was hoping for. What would you say is the biggest responsibility you've taken on so far, and what result are you most proud of?",
			},
			{
				role: "user",
				text: "Describe the biggest responsibility you have taken on and the result you are most proud of.",
			},
			{
				role: "assistant",
				text: "Great. And on the technical side — how do you usually approach a problem you haven't seen before? Walk me through your process.",
			},
			{
				role: "user",
				text: "Explain how you approach an unfamiliar problem, step by step.",
			},
			{
				role: "assistant",
				text: "Makes sense. One more — where do you see yourself growing in the next couple of years, and what would you want to learn here?",
			},
			{
				role: "user",
				text: "Describe your growth goal for the next couple of years and what you would want to learn in this role.",
			},
			{
				role: "assistant",
				text: "Really helpful. That's all the questions I have — do you have anything you'd like to ask me about the role or the team?",
			},
			{
				role: "user",
				text: "Ask one or two genuine questions about the role, the team, or the company.",
			},
			{
				role: "assistant",
				text: "Those are good questions. I appreciate you preparing for this — it's been a pleasure talking with you today.",
			},
		],
	},
	{
		id: "self-introduction",
		scenarioId: "self-introduction",
		title: "Self introduction",
		description:
			"A short first conversation with a new colleague: introduce yourself, describe your experience, and end with a friendly question.",
		turns: [
			{
				role: "assistant",
				text: "Hi — welcome aboard! I don't think we've properly met yet. Tell me a little about yourself and what your role here is.",
			},
			{
				role: "user",
				text: "Introduce yourself in a few sentences: your background, your experience, and your current role.",
			},
			{
				role: "assistant",
				text: "Nice to meet you properly. What were you doing before you joined us? I'd love to hear about the experience you're bringing over.",
			},
			{
				role: "user",
				text: "Describe what you did before this role and the experience you bring with you.",
			},
			{
				role: "assistant",
				text: "That's a solid background. And what are you most looking forward to in this role?",
			},
			{
				role: "user",
				text: "Say what you are most looking forward to in your new role.",
			},
			{
				role: "assistant",
				text: "Love that energy. And how about you — what's one thing you're looking forward to working on together?",
			},
			{
				role: "user",
				text: "End the introduction with a friendly question back to your colleague.",
			},
			{
				role: "assistant",
				text: "Great question — let's catch up properly over coffee soon. Welcome again!",
			},
		],
	},
	{
		id: "one-on-one",
		scenarioId: "one-on-one",
		title: "1-on-1 with your manager",
		description:
			"A realistic 1-on-1: update your manager, discuss workload and priorities, and ask for support on growth.",
		turns: [
			{
				role: "assistant",
				text: "Good to see you. How's the week been on your side? Anything you want to put on the table first?",
			},
			{
				role: "user",
				text: "Give a brief, honest update on your week so far.",
			},
			{
				role: "assistant",
				text: "Got it. You mentioned feeling overloaded last time — how's your workload looking now? Are the priorities clear enough?",
			},
			{
				role: "user",
				text: "Describe your current workload, whether you have the capacity for it, and which priorities are clear or unclear.",
			},
			{
				role: "assistant",
				text: "Thanks for being honest. If something has to slip this sprint, what would you cut — and what would you need to protect?",
			},
			{
				role: "user",
				text: "Explain what you would deprioritize and what you need to protect.",
			},
			{
				role: "assistant",
				text: "That trade-off sounds reasonable. Beyond the day-to-day, how are you thinking about your growth? Anything you'd like more of from me?",
			},
			{
				role: "user",
				text: "Share one growth goal and one concrete thing you would like from your manager.",
			},
			{
				role: "assistant",
				text: "That's fair — I can support you on that. Let's add a short check-in on it to next week's 1-on-1 so it doesn't slip. Anything else before we wrap?",
			},
			{
				role: "user",
				text: "Close the 1-on-1: confirm the agreement and thank your manager.",
			},
			{
				role: "assistant",
				text: "Sounds good. Enjoy the rest of your week, and see you at the next one.",
			},
		],
	},
];

export function getReadyTranscriptByScenario(
	scenarioId: string,
): ReadyTranscript | undefined {
	return READY_TRANSCRIPTS.find((t) => t.scenarioId === scenarioId);
}

export function transcriptTitle(id: string): string {
	return READY_TRANSCRIPTS.find((t) => t.id === id)?.title ?? "Ready transcript";
}

// ── Vocabulary matching ───────────────────────────────────────────────────
// Case-insensitive whole-word matching with punctuation normalized, so
// "trade-off" matches "trade-off" and "trade off".

const APOSTROPHES = /[\u2018\u2019\u0060\u00b4]/g;

function normWord(word: string): string {
	return word
		.toLowerCase()
		.replace(APOSTROPHES, "'")
		.replace(/[^a-z0-9'+-]/g, "")
		.trim();
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Find which target phrases occur in `text`. Phrases may contain spaces or a
 * hyphen and are matched as exact normalized words (not substrings of longer
 * words). Returns the target phrases that matched at least once.
 */
export function matchTargetPhrases(
	text: string,
	targets: string[],
): string[] {
	if (!text || targets.length === 0) return [];
	const normalized = ` ${text.toLowerCase().replace(APOSTROPHES, "'")} `;
	const used = new Set<string>();
	for (const target of targets) {
		const needle = normWord(target);
		if (!needle) continue;
		const pattern = new RegExp(
			`(?<![a-z0-9'+/-])${escapeRegExp(needle)}(?![a-z0-9'+/-])`,
		);
		if (pattern.test(normalized)) used.add(target);
	}
	return [...used];
}

// ── Transcript advance helpers (pure) ─────────────────────────────────────

/** Returns the assistant turn at index i, or null when the script is done. */
export function assistantTurnAt(
	transcript: ReadyTranscript,
	index: number,
): TranscriptTurn | null {
	const turn = transcript.turns[index];
	return turn && turn.role === "assistant" ? turn : null;
}

/** Returns the user cue that follows assistant turn at `index`, if any. */
export function userCueAfter(
	transcript: ReadyTranscript,
	assistantIndex: number,
): string | null {
	const next = transcript.turns[assistantIndex + 1];
	return next && next.role === "user" ? next.text : null;
}
