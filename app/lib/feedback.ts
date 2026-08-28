import type { Scenario, EnglishLevel } from "~/data/scenarios";
import { chat, type ChatMessage, type LLMConfig } from "~/lib/providers";

export type FeedbackScores = {
	grammar: number;
	vocabulary: number;
	fluency: number;
	clarity: number;
	professionalism: number;
};

export type Correction = {
	original: string;
	correction: string;
	explanation: string;
};

export type Feedback = {
	scores: FeedbackScores;
	corrections: Correction[];
	strengths: string[];
	recommendations: string[];
};

const FEEDBACK_SCHEMA = `{
  "scores": {
    "grammar": 0-100,
    "vocabulary": 0-100,
    "fluency": 0-100,
    "clarity": 0-100,
    "professionalism": 0-100
  },
  "corrections": [
    { "original": "the user's original sentence", "correction": "a more natural/professional way to say it", "explanation": "why this change helps" }
  ],
  "strengths": ["what the user did well"],
  "recommendations": ["one concrete next practice focus"]
}`;

function buildFeedbackSystem(scenario: Scenario, level: EnglishLevel): string {
	return [
		`You are a professional business English coach. Analyze the following roleplay conversation.`,
		``,
		`SCENARIO: ${scenario.title} · ${scenario.userRole} talking to ${scenario.aiRole}.`,
		`OBJECTIVE: ${scenario.objective}`,
		`USER'S LEVEL: ${level}`,
		`TARGET VOCABULARY: ${scenario.targetVocabulary.join(", ") || "none"}`,
		``,
		`Focus on the USER's messages only. Score each dimension 0-100:`,
		`- grammar: correctness of the user's sentences`,
		`- vocabulary: word choice, precision, and use of target vocabulary`,
		`- fluency: flow, natural pacing, and how smoothly ideas connect`,
		`- clarity: how easy the user's message is to understand`,
		`- professionalism: tone, politeness, and workplace-appropriateness`,
		``,
		`Provide up to 5 concrete corrections taken from the user's actual words, with a natural rewrite and a short explanation of why it's better.`,
		`List 2-3 strengths the user showed.`,
		`List 2-3 specific, actionable recommendations for the next practice session.`,
		``,
		`Return ONLY a single JSON object matching this exact schema (no markdown, no extra text):`,
		FEEDBACK_SCHEMA,
	].join("\n");
}

function clampScore(value: unknown): number {
	const n = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(n)) return 0;
	return Math.max(0, Math.min(100, Math.round(n)));
}

function extractJson(raw: string): unknown {
	const trimmed = raw.trim();
	try {
		return JSON.parse(trimmed);
	} catch {
		// fall through to fence/brace extraction
	}

	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
	const candidate = fenced ? fenced[1] : trimmed;

	const start = candidate.indexOf("{");
	const end = candidate.lastIndexOf("}");
	if (start === -1 || end === -1 || end <= start) {
		throw new Error("Feedback response did not contain valid JSON.");
	}
	try {
		return JSON.parse(candidate.slice(start, end + 1));
	} catch {
		throw new Error("Feedback response contained malformed JSON.");
	}
}

export function parseFeedback(raw: string): Feedback {
	const data = extractJson(raw) as {
		scores?: Partial<FeedbackScores>;
		corrections?: unknown;
		strengths?: unknown;
		recommendations?: unknown;
	};

	const scores = data?.scores ?? {};
	const feedback: Feedback = {
		scores: {
			grammar: clampScore(scores.grammar),
			vocabulary: clampScore(scores.vocabulary),
			fluency: clampScore(scores.fluency),
			clarity: clampScore(scores.clarity),
			professionalism: clampScore(scores.professionalism),
		},
		corrections: [],
		strengths: [],
		recommendations: [],
	};

	if (Array.isArray(data?.corrections)) {
		for (const item of data.corrections as Partial<Correction>[]) {
			if (item && typeof item === "object") {
				feedback.corrections.push({
					original: String(item.original ?? ""),
					correction: String(item.correction ?? ""),
					explanation: String(item.explanation ?? ""),
				});
			}
		}
	}
	if (Array.isArray(data?.strengths)) {
		feedback.strengths = data.strengths
			.map((s) => String(s))
			.filter(Boolean);
	}
	if (Array.isArray(data?.recommendations)) {
		feedback.recommendations = data.recommendations
			.map((s) => String(s))
			.filter(Boolean);
	}

	return feedback;
}

export function overallScore(feedback: Feedback): number {
	const values = Object.values(feedback.scores);
	if (values.length === 0) return 0;
	return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export async function generateFeedback(
	config: LLMConfig,
	scenario: Scenario,
	level: EnglishLevel,
	history: ChatMessage[],
): Promise<Feedback> {
	const system = buildFeedbackSystem(scenario, level);
	const transcript = history
		.map((m) => `${m.role === "user" ? "USER" : "AI"}: ${m.content}`)
		.join("\n\n");

	const raw = await chat(
		config,
		[
			{ role: "system", content: system },
			{
				role: "user",
				content: `Here is the conversation to analyze:\n\n${transcript}`,
			},
		],
		{ temperature: 0.2, maxTokens: 1600, json: true },
	);
	return parseFeedback(raw);
}
