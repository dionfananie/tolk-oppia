export type Role = "system" | "user" | "assistant";

export type ChatMessage = {
	role: Role;
	content: string;
};

export type ProviderName = "deepseek" | "glm" | "openai";

export type LLMConfig = {
	provider: ProviderName;
	apiKey: string;
	model: string;
	/** Custom base URL for OpenAI-compatible endpoints (BYOK universal). */
	baseUrl?: string;
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
	{
		provider: "openai",
		label: "OpenAI-compatible",
		description:
			"Bring any OpenAI-compatible API key (OpenAI, OpenRouter, Groq, Mistral, Together…) with a custom base URL and model.",
		models: [
			{ id: "gpt-4o-mini", description: "OpenAI — fast and cost-effective" },
			{ id: "gpt-4o", description: "OpenAI — strong general model" },
			{ id: "gpt-4.1-mini", description: "OpenAI — lightweight latest" },
		],
	},
];

export const PROVIDER_DEFAULT_BASE_URLS: Record<ProviderName, string> = {
	deepseek: "https://api.deepseek.com",
	glm: "https://open.bigmodel.cn/api/paas/v4",
	openai: "https://api.openai.com/v1",
};

const PROVIDER_ENDPOINTS: Record<ProviderName, string> = {
	deepseek: "https://api.deepseek.com/chat/completions",
	glm: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
	openai: "https://api.openai.com/v1/chat/completions",
};

/** Normalize a base URL and append the chat completions path. */
export function endpointFor(config: LLMConfig): string {
	if (config.baseUrl && config.baseUrl.trim()) {
		return config.baseUrl.trim().replace(/\/+$/, "") + "/chat/completions";
	}
	return PROVIDER_ENDPOINTS[config.provider];
}

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
		res = await fetch(endpointFor(config), {
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
