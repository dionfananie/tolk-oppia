export type Role = "system" | "user" | "assistant";

export type ChatMessage = {
	role: Role;
	content: string;
};

// Provider AI yang tersedia. Label = dropdown provider.
// `vendor` = prefix id model di OpenRouter (filter list model per provider).
export type ProviderName = "deepseek" | "zai" | "meta" | "chatgpt" | "claude";

export type LLMConfig = {
	provider: ProviderName;
	/**
	 * OpenRouter API key (sk-or-v1-…).
	 * - Jika terisi → BYOK lokal: `chat()` fetch OpenRouter langsung dari browser.
	 * - Jika kosong → server relay: `chat()` POST /api/chat (key disimpan terenkripsi di server,
	 *   butuh login). Agent memilih jalur otomatis.
	 */
	apiKey?: string;
	/** Id model OpenRouter lengkap, mis. `deepseek/deepseek-v4-flash`. */
	model: string;
};

// ── Provider metadata + preset model (dari list OpenRouter, di-scan 2026-08-29) ──
export const PROVIDER_META: {
	provider: ProviderName;
	label: string;
	description: string;
	/** OpenRouter `vendor/` prefix utk filter list model. */
	vendor: string;
	defaultModel: string;
	models: { id: string; label: string }[];
}[] = [
	{
		provider: "deepseek",
		label: "DeepSeek",
		description: "Fast, low-cost reasoning & chat.",
		vendor: "deepseek",
		defaultModel: "deepseek/deepseek-v4-flash",
		models: [
			{ id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash" },
			{ id: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro" },
			{ id: "deepseek/deepseek-chat", label: "DeepSeek V3" },
			{ id: "deepseek/deepseek-r1", label: "DeepSeek R1" },
		],
	},
	{
		provider: "zai",
		label: "z.ai (Zhipu)",
		description: "GLM series — good free tier flash.",
		vendor: "z-ai",
		defaultModel: "z-ai/glm-5.3-flash",
		models: [
			{ id: "z-ai/glm-5.3-flash", label: "GLM 5.3 Flash" },
			{ id: "z-ai/glm-5.3", label: "GLM 5.3" },
			{ id: "z-ai/glm-5-flash:free", label: "GLM 5 Flash (free)" },
		],
	},
	{
		provider: "meta",
		label: "Meta",
		description: "Llama open-weight models.",
		vendor: "meta-llama",
		defaultModel: "meta-llama/llama-4-maverick",
		models: [
			{ id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
			{ id: "meta-llama/llama-4-scout", label: "Llama 4 Scout" },
			{ id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
		],
	},
	{
		provider: "chatgpt",
		label: "ChatGPT (OpenAI)",
		description: "GPT & o-series models.",
		vendor: "openai",
		defaultModel: "openai/gpt-4o-mini",
		models: [
			{ id: "openai/gpt-4o-mini", label: "GPT-4o mini" },
			{ id: "openai/gpt-4o", label: "GPT-4o" },
			{ id: "openai/gpt-5", label: "GPT-5" },
		],
	},
	{
		provider: "claude",
		label: "Claude (Anthropic)",
		description: "Anthropic Claude models.",
		vendor: "anthropic",
		defaultModel: "anthropic/claude-sonnet-5",
		models: [
			{ id: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5" },
			{ id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5" },
			{ id: "anthropic/claude-opus-5", label: "Claude Opus 5" },
		],
	},
];

export const PROVIDERS: ProviderName[] = PROVIDER_META.map((p) => p.provider);

export function getModels(provider: ProviderName) {
	return PROVIDER_META.find((p) => p.provider === provider)?.models ?? [];
}

export function defaultModel(provider: ProviderName) {
	return PROVIDER_META.find((p) => p.provider === provider)?.defaultModel ?? "";
}

export function providerLabel(provider: ProviderName) {
	return PROVIDER_META.find((p) => p.provider === provider)?.label ?? provider;
}

/** Cari label ramah utk sebuah id model OpenRouter (dari preset). Return id jika tak ketemu. */
export function labelForModel(id: string): string | null {
	for (const p of PROVIDER_META) {
		for (const m of p.models) {
			if (m.id === id) return m.label;
		}
	}
	return null;
}

export type ChatOptions = {
	temperature?: number;
	maxTokens?: number;
	json?: boolean;
};

// ── OpenRouter call (BYOK endpoint, OpenAI-compatible) ──
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function callOpenRouter(
	apiKey: string,
	model: string,
	messages: ChatMessage[],
	options: ChatOptions,
): Promise<string> {
	const body: Record<string, unknown> = {
		model,
		messages,
		temperature: options.temperature ?? 0.7,
		max_tokens: options.maxTokens ?? 1024,
	};
	if (options.json) body.response_format = { type: "json_object" };

	let res: Response;
	try {
		res = await fetch(OPENROUTER_URL, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${apiKey}`,
				"HTTP-Referer": "https://tolk.oppia.world",
				"X-Title": "TOLK",
			},
			body: JSON.stringify(body),
		});
	} catch (error) {
		throw new Error(
			`Could not reach OpenRouter. Check your connection and API key. (${
				error instanceof Error ? error.message : "network error"
			})`,
		);
	}

	if (!res.ok) {
		let detail = `HTTP ${res.status}`;
		try {
			const data = (await res.json()) as { error?: { message?: string } };
			if (data?.error?.message) detail = data.error.message;
		} catch {
			// ignore parse errors on the error body
		}
		throw new Error(`OpenRouter request failed: ${detail}`);
	}

	const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
	const content = data?.choices?.[0]?.message?.content;
	if (typeof content !== "string" || !content.trim()) {
		throw new Error("OpenRouter returned an empty response.");
	}
	return content.trim();
}

/**
 * Chat dengan config yang diberikan.
 * `apiKey` terisi → BYOK lokal (fetch OpenRouter langsung).
 * `apiKey` kosong → relay server `/api/chat` (key tersimpan server-side, butuh login).
 */
export async function chat(
	config: LLMConfig,
	messages: ChatMessage[],
	options: ChatOptions = {},
): Promise<string> {
	const { model } = config;
	if (!model.trim()) throw new Error("Pilih model terlebih dahulu.");

	if (config.apiKey) {
		return callOpenRouter(config.apiKey, model, messages, options);
	}

	// Relay server
	let res: Response;
	try {
		res = await fetch("/api/chat", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				model,
				messages,
				temperature: options.temperature,
				maxTokens: options.maxTokens,
				json: options.json,
			}),
		});
	} catch (error) {
		throw new Error(
			`Server relay tidak bisa dihubungi (${
				error instanceof Error ? error.message : "network error"
			})`,
		);
	}

	const data = (await res.json().catch(() => ({}))) as {
		content?: string;
		error?: string;
	};
	if (!res.ok) {
		if (data.error === "no_api_key") {
			throw new Error("Kamu belum menyimpan API key di akun. Buka Settings > AI provider lalu simpan key.");
		}
		throw new Error(data.error || `Server relay failed (HTTP ${res.status})`);
	}
	if (typeof data.content !== "string" || !data.content.trim()) {
		throw new Error("Server relay returned an empty response.");
	}
	return data.content.trim();
}
