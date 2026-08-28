export type Role = "system" | "user" | "assistant";

export type ChatMessage = {
	role: Role;
	content: string;
};

export type ProviderName = "deepseek" | "glm";

export type LLMConfig = {
	provider: ProviderName;
	apiKey: string;
	model: string;
};

export const PROVIDER_META: {
	provider: ProviderName;
	label: string;
	description: string;
	models: { id: string; description: string }[];
}[] = [
	{
		provider: "deepseek",
		label: "DeepSeek",
		description: "Fast, low-cost, OpenAI-compatible API. Great default for conversation.",
		models: [
			{ id: "deepseek-chat", description: "Fast general-purpose model" },
			{ id: "deepseek-reasoner", description: "Reasoning model, more thoughtful but slower" },
		],
	},
	{
		provider: "glm",
		label: "GLM (Zhipu AI)",
		description: "Another solid BYOK option with a free-tier flash model.",
		models: [
			{ id: "glm-4-flash", description: "Fast and free-tier friendly" },
			{ id: "glm-4-air", description: "Balanced speed and quality" },
			{ id: "glm-4-plus", description: "Strongest model, slower" },
		],
	},
];

const PROVIDER_ENDPOINTS: Record<ProviderName, string> = {
	deepseek: "https://api.deepseek.com/chat/completions",
	glm: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
};

export function getModels(provider: ProviderName) {
	return PROVIDER_META.find((p) => p.provider === provider)?.models ?? [];
}

export function defaultModel(provider: ProviderName) {
	return getModels(provider)[0]?.id ?? "";
}

export type ChatOptions = {
	temperature?: number;
	maxTokens?: number;
	json?: boolean;
};

export async function chat(
	config: LLMConfig,
	messages: ChatMessage[],
	options: ChatOptions = {},
): Promise<string> {
	const body: Record<string, unknown> = {
		model: config.model,
		messages,
		temperature: options.temperature ?? 0.7,
		max_tokens: options.maxTokens ?? 1024,
	};
	if (options.json) {
		body.response_format = { type: "json_object" };
	}

	let res: Response;
	try {
		res = await fetch(PROVIDER_ENDPOINTS[config.provider], {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${config.apiKey}`,
			},
			body: JSON.stringify(body),
		});
	} catch (error) {
		throw new Error(
			`Could not reach ${config.provider}. Check your connection and API key. (${error instanceof Error ? error.message : "network error"})`,
		);
	}

	if (!res.ok) {
		let detail = `HTTP ${res.status}`;
		try {
			const data = (await res.json()) as {
				error?: { message?: string };
			};
			if (data?.error?.message) detail = data.error.message;
		} catch {
			// ignore parse errors on the error body
		}
		throw new Error(`${config.provider} request failed: ${detail}`);
	}

	const data = (await res.json()) as {
		choices?: { message?: { content?: string } }[];
	};
	const content = data?.choices?.[0]?.message?.content;
	if (typeof content !== "string" || !content.trim()) {
		throw new Error(`${config.provider} returned an empty response.`);
	}
	return content.trim();
}
