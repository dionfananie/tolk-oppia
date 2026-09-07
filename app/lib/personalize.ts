// personalize.ts — Turn an uploaded document (CV, PRD, meeting notes…) into a
// personalized "interviewee" ready transcript. Only the user's cue turns are
// rewritten: interviewer turns stay fixed so the AI keeps speaking strictly
// from the ready transcript. The extracted document text is sent through the
// user's configured AI provider; nothing is stored by TOLK.

import { chat, type LLMConfig } from "~/lib/providers";
import type { ReadyTranscript, TranscriptTurn } from "~/data/transcripts";
import type { Scenario } from "~/data/scenarios";

const MAX_DOC_CHARS = 12_000;
const MAX_TURN_CHARS = 220;

const SCHEMA_HINT = `{"turns":[{"text":"rewritten cue for the first user turn"},{"text":"rewritten cue for the second user turn"}]}`;

export type PersonalizeOutcome =
	| { ok: true; userTurns: string[]; summary: string }
	| { ok: false; reason: string };

export type PersonalizeOptions = {
	documentName: string;
	documentText: string;
	level: Scenario["difficulty"];
};

function buildSystemPrompt(transcript: ReadyTranscript, options: PersonalizeOptions): string {
	const userTurnCount = transcript.turns.filter((t) => t.role === "user").length;
	return [
		`You prepare guided practice prompts for an English roleplay session between a USER and an ${transcript.title} counterpart.`,
		``,
		`The USER is ${options.level} level.`,
		`Below is a ready transcript where the AI role (assistant) speaks fixed lines and each USER turn is a short prompt that tells the user what to cover when they reply.`,
		``,
		`THE USER'S DOCUMENT: ${options.documentName}`,
		`Rewrite each of the ${userTurnCount} USER prompts so they reference only concrete, relevant details from the document (facts, numbers, projects, products, responsibilities) that the user could genuinely use when speaking.`,
		``,
		`RULES:`,
		`- Output exactly ${userTurnCount} entries, one per USER turn, in the same order.`,
		`- Keep each entry a clear, natural prompt (2-3 short sentences, under 45 words) telling the user what to cover in their reply.`,
		`- Never invent facts that are not supported by the document. If the document has nothing relevant for a turn, leave that prompt close to its original meaning.`,
		`- Do not add metadata, explanations, or numbering outside the JSON.`,
		`- Keep the assistant lines unchanged — never output them.`,
		``,
		`Return ONLY a single JSON object matching this shape:`,
		SCHEMA_HINT,
	].join("\n");
}

function extractJson(raw: string): unknown {
	const trimmed = raw.trim();
	try {
		return JSON.parse(trimmed);
	} catch {
		// fall through
	}
	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
	const candidate = fenced ? fenced[1] : trimmed;
	const start = candidate.indexOf("{");
	const end = candidate.lastIndexOf("}");
	if (start === -1 || end === -1 || end <= start) return null;
	try {
		return JSON.parse(candidate.slice(start, end + 1));
	} catch {
		return null;
	}
}

/** Validate and normalize the model's output into per-turn prompt strings. */
export function parsePersonalizedTurns(raw: string, expectedCount: number): string[] | null {
	const data = extractJson(raw) as { turns?: unknown } | null;
	if (!data || typeof data !== "object") return null;
	if (!Array.isArray(data.turns) || data.turns.length !== expectedCount) return null;

	const result: string[] = [];
	for (const entry of data.turns) {
		if (!entry || typeof entry !== "object") return null;
		const text = (entry as { text?: unknown }).text;
		if (typeof text !== "string") return null;
		const clean = text.trim();
		if (!clean) return null;
		result.push(clean.length > MAX_TURN_CHARS ? clean.slice(0, MAX_TURN_CHARS) : clean);
	}
	return result.length === expectedCount ? result : null;
}

export async function personalizeIntervieweeTranscript(
	config: LLMConfig,
	transcript: ReadyTranscript,
	options: PersonalizeOptions,
): Promise<PersonalizeOutcome> {
	const userTurnCount = transcript.turns.filter((t) => t.role === "user").length;
	if (userTurnCount === 0) {
		return { ok: false, reason: "This ready transcript has no interviewee turns to personalize." };
	}

	const docExcerpt =
		options.documentText.length > MAX_DOC_CHARS
			? `${options.documentText.slice(0, MAX_DOC_CHARS)}\n\n[…]`
			: options.documentText;

	const original = transcript.turns
		.map((t, i) => `${i + 1}. ${t.role.toUpperCase()}: ${t.text}`)
		.join("\n");

	const userMessage = [
		`READY TRANSCRIPT:`,
		original,
		``,
		`DOCUMENT CONTENT (${options.documentName}):`,
		docExcerpt,
		``,
		`Now return the JSON with rewritten USER prompts only.`,
	].join("\n");

	let raw: string;
	try {
		raw = await chat(
			config,
			[
				{ role: "system", content: buildSystemPrompt(transcript, options) },
				{ role: "user", content: userMessage },
			],
			{ temperature: 0.4, maxTokens: 1600, json: true },
		);
	} catch (cause) {
		return {
			ok: false,
			reason: cause instanceof Error ? cause.message : "Could not generate from the document.",
		};
	}

	const turns = parsePersonalizedTurns(raw, userTurnCount);
	if (!turns) {
		return {
			ok: false,
			reason:
				"The AI response could not be read as a transcript. Keep the document shorter, or try again.",
		};
	}
	return {
		ok: true,
		userTurns: turns,
		summary: "Interviewee prompts rewritten from your document.",
	};
}

/** Build a full turn list from the original transcript plus new user texts. */
export function applyPersonalizedTurns(
	transcript: ReadyTranscript,
	userTexts: string[],
): TranscriptTurn[] {
	let userIndex = 0;
	return transcript.turns.map((turn) => {
		if (turn.role === "user") {
			const text = userTexts[userIndex]?.trim();
			userIndex += 1;
			return text ? { role: "user", text } : turn;
		}
		return turn;
	});
}
