// types.ts — Tipe inti arch AI Provider Layer (BYOK multi-provider).
// Dipakai backend worker. Prinsip: aplikasi hanya orchestrator; key milik user,
// disimpan terenkripsi di server; fetch langsung ke provider (tanpa SDK).

export type AIProviderId =
	| "openai"
	| "deepseek"
	| "anthropic"
	| "gemini"
	| "openrouter"
	| "groq"
	| "together";

export type AIAdapter = "openai-compatible" | "anthropic" | "gemini" | "openrouter";

export interface ProviderConfig {
	id: AIProviderId;
	name: string;
	adapter: AIAdapter;
	/** Default base URL. Di-scan dari dokumentasi resmi provider. */
	baseURL?: string;
	supports: {
		streaming: boolean;
		tools: boolean;
		vision: boolean;
	};
	/** Preset model yang tersedia (dapat di-update tanpa ubah UI). */
	models: ModelDefinition[];
}

export interface ModelDefinition {
	/** Id model asli provider (sesuai request API provider). */
	id: string;
	name: string;
	capabilities: {
		chat: boolean;
		vision: boolean;
		tools: boolean;
		structuredOutput: boolean;
	};
}

/** Input ter-normalisasi dari relay /api/chat. */
export interface GenerateParams {
	apiKey: string;
	model: string;
	messages: AIChatMessage[];
	temperature?: number;
	maxTokens?: number;
	/** Kalau user minta JSON output. Provider OpenAI-compatible pakai response_format. */
	json?: boolean;
	/** Base URL override (custom endpoint/gateway). Null → pakai default registry. */
	baseURL?: string;
}

export interface AIChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

/** Output ter-normalisasi sebelum dikembalikan ke frontend. */
export interface GenerateResult {
	content: string;
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
		totalTokens?: number;
	};
	provider: AIProviderId;
	model: string;
}

/** Kontrak tiap adapter provider. */
export interface AIProvider {
	generate(params: GenerateParams): Promise<GenerateResult>;
}

/** Normalized error — frontend cukup tahu kode ini. */
export type AIErrorCode =
	| "INVALID_API_KEY"
	| "RATE_LIMITED"
	| "INSUFFICIENT_CREDITS"
	| "MODEL_NOT_FOUND"
	| "PROVIDER_ERROR"
	| "TIMEOUT"
	| "UNSUPPORTED_PROVIDER";

export class AIError extends Error {
	code: AIErrorCode;
	provider: AIProviderId;
	retryable: boolean;

	constructor(code: AIErrorCode, provider: AIProviderId, message: string, retryable = false) {
		super(message);
		this.name = "AIError";
		this.code = code;
		this.provider = provider;
		this.retryable = retryable;
	}
}
