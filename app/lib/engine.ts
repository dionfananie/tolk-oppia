import type { Scenario, EnglishLevel } from "~/data/scenarios";
import { chat, type ChatMessage, type LLMConfig } from "~/lib/providers";

const LEVEL_GUIDANCE: Record<EnglishLevel, string> = {
	beginner:
		"Use simple vocabulary and short sentences. Speak clearly and patiently. Be encouraging.",
	intermediate:
		"Use natural professional English. Idiomatic phrases are fine. Follow up and ask questions.",
	advanced:
		"Use full professional fluency with idiomatic expressions. Challenge the user, push back, and hold your ground where the role would.",
};

function vocabularyGuidance(scenario: Scenario): string {
	if (scenario.targetVocabulary.length === 0) return "";
	return `Naturally invite the user to use these words or phrases when it fits the conversation: ${scenario.targetVocabulary.join(", ")}. Never force or list them explicitly.`;
}

export function buildSystemPrompt(
	scenario: Scenario,
	level: EnglishLevel,
	style: "direct" | "encouraging" = "encouraging",
): string {
	const constraintLines = scenario.constraints
		.map((c) => `- ${c}`)
		.join("\n");

	return [
		`You are playing a role in an English conversation practice session.`,
		``,
		`YOUR ROLE: ${scenario.aiRole}`,
		`THE USER'S ROLE: ${scenario.userRole}`,
		`SETTING: ${scenario.context}`,
		`YOUR OBJECTIVE: ${scenario.objective}`,
		``,
		`RULES:`,
		`- Stay fully in character as ${scenario.aiRole}. Never break character, never act as a language teacher during the conversation.`,
		`- Speak naturally and realistically, the way a real professional would in this situation.`,
		`- The user's English level is ${level}: ${LEVEL_GUIDANCE[level]}`,
		`- Do NOT correct the user's grammar or vocabulary during the conversation. Just converse.`,
		`- Keep your responses short and realistic: 1 to 4 sentences.`,
		`- Ask follow-up questions to keep the conversation moving.`,
		`- Guide the conversation toward the objective naturally.`,
		`- ${constraintLines}`,
		`- ${vocabularyGuidance(scenario)}`,
		style === "direct"
			? `- Tone: direct and efficient. Do not overpraise or soften unnecessarily.`
			: `- Tone: encouraging and supportive. Acknowledge what the user does well, gently.`,
	].join("\n");
}

export async function openConversation(
	config: LLMConfig,
	scenario: Scenario,
	level: EnglishLevel,
	style: "direct" | "encouraging" = "encouraging",
): Promise<ChatMessage> {
	const system = buildSystemPrompt(scenario, level, style);
	const content = await chat(
		config,
		[
			{ role: "system", content: system },
			{
				role: "user",
				content:
					"(Begin the conversation now. Speak first, in character, exactly how you would open this situation in real life.)",
			},
		],
		{ temperature: 0.85, maxTokens: 512 },
	);
	return { role: "assistant", content };
}

export async function respond(
	config: LLMConfig,
	scenario: Scenario,
	level: EnglishLevel,
	history: ChatMessage[],
	style: "direct" | "encouraging" = "encouraging",
): Promise<string> {
	const system = buildSystemPrompt(scenario, level, style);
	const content = await chat(
		config,
		[{ role: "system", content: system }, ...history],
		{ temperature: 0.8, maxTokens: 512 },
	);
	return content;
}
