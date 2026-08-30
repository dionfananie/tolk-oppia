// providers.ts (frontend) — Datasheet provider/model utk dropdown UI + `chat()` SERVER-RELAY.
// `apiKey` tidak lagi beredar di frontend: semua request → POST /api/chat (server-proxy),
// key diambil dari akun user (server-side, terenkripsi). Hanya provider+model yg dikirim.

export type Role = "system" | "user" | "assistant";

export type ChatMessage = {
	role: Role;
	content: string;
};

// Provider AI yang tersedia di backend (sync dgn workers/ai/registry.ts).
export type ProviderName =
	| "openai"
	| "deepseek"
	| "anthropic"
	| "gemini"
	| "openrouter"
	| "groq"
	| "together";

export type LLMConfig = {
	provider: ProviderName;
	/** Id model asli provider. */
	model: string;
};

// ── Provider metadata + preset model (untuk dropdown; bentuknya label + model asli). ──
export const PROVIDER_META: {
	provider: ProviderName;
	label: string;
	description: string;
	defaultModel: string;
	models: { id: string; label: string }[];
}[] = [
	{
		provider: "openai",
		label: "OpenAI (ChatGPT)",
		description: "GPT & o-series models via API platform.",
		defaultModel: "gpt-4o-mini",
		models: [
			{ id: "gpt-4o-mini", label: "GPT-4o mini" },
			{ id: "gpt-4o", label: "GPT-4o" },
			{ id: "gpt-4.1", label: "GPT-4.1" },
			{ id: "o3-mini", label: "o3 mini" },
		],
	},
	{
		provider: "deepseek",
		label: "DeepSeek",
		description: "Fast, low-cost reasoning & chat.",
		defaultModel: "deepseek-v4-flash",
		models: [
			{ id: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
			{ id: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
			{ id: "deepseek-v4-flash-vision-exp", label: "DeepSeek V4 Flash Vision (Exp)" },
		],
	},
	{
		provider: "anthropic",
		label: "Anthropic (Claude)",
		description: "Claude models — strong reasoning & long context.",
		defaultModel: "claude-sonnet-4-5",
		models: [
			{ id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
			{ id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
			{ id: "claude-opus-4-1", label: "Claude Opus 4.1" },
		],
	},
	{
		provider: "gemini",
		label: "Google Gemini",
		description: "Gemini — free tier available on Flash models.",
		defaultModel: "gemini-2.5-flash",
		models: [
			{ id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
			{ id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
			{ id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
		],
	},
	{
		provider: "openrouter",
		label: "OpenRouter",
		description: "Aggregator — ratusan model via satu key.",
		defaultModel: "deepseek/deepseek-v4-flash",
		models: [
			{ id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash (via OR)" },
			{ id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5 (via OR)" },
			{ id: "openai/gpt-4o", label: "GPT-4o (via OR)" },
		],
	},
	{
		provider: "groq",
		label: "Groq",
		description: "LPU inference — sangat cepat, open models.",
		defaultModel: "llama-3.3-70b-versatile",
		models: [
			{ id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
			{ id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
			{ id: "gemma2-9b-it", label: "Gemma 2 9B IT" },
		],
	},
	{
		provider: "together",
		label: "Together AI",
		description: "Open models & fine-tuning platform.",
		defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
		models: [
			{ id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", label: "Llama 3.3 70B Instruct" },
			{ id: "deepseek-ai/DeepSeek-V3", label: "DeepSeek V3" },
			{ id: "Qwen/Qwen2.5-72B-Instruct", label: "Qwen2.5 72B Instruct" },
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

/** Cari label ramah utk sebuah id model (dari preset). Return id jika tak ketemu. */
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

export type ChatResponse = {
	content: string;
	usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
};

/**
 * Chat — SELALU server-proxy: POST /api/chat. Server memakai key user (tersimpan terenkripsi
 * di akun) untuk memanggil provider yang dipilih. Key TIDAK pernah dikirim dari browser.
 */
export async function chat(
	config: LLMConfig,
	messages: ChatMessage[],
	options: ChatOptions = {},
): Promise<string> {
	const { provider, model } = config;
	if (!model.trim()) throw new Error("Pilih model terlebih dahulu.");

	let res: Response;
	try {
		res = await fetch("/api/chat", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				provider,
				model,
				messages,
				temperature: options.temperature,
				maxTokens: options.maxTokens,
				json: options.json,
			}),
		});
	} catch (error) {
		throw new Error(
			`Server relay tidak bisa dihubungi (${error instanceof Error ? error.message : "network error"})`,
		);
	}

	const data = (await res.json().catch(() => ({}))) as ChatResponse & {
		error?: string;
		code?: string;
	};
	if (!res.ok) {
		if (data.code === "no_api_key" || res.status === 404) {
			throw new Error(
				"Belum ada key untuk provider ini. Buka Settings → AI providers lalu tambahkan key-nya.",
			);
		}
		if (data.code === "RATE_LIMITED") {
			throw new Error("Terlalu banyak permintaan. Coba sebentar lagi.");
		}
		throw new Error(data.error || `Server relay gagal (HTTP ${res.status}).`);
	}
	if (typeof data.content !== "string" || !data.content.trim()) {
		throw new Error("Server relay mengembalikan respons kosong.");
	}
	return data.content.trim();
}
