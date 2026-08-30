// providers/openai-compatible.ts — Adapter generic utk SEMUA provider OpenAI-compatible.
// Pakai fetch langsung (tanpa SDK), cocok utk Worker. Base URL per provider dr registry
// (atau override custom dari user utk gateway). Normalisasi respon OpenAI `choices`.

import {
	AIError,
	type AIProvider,
	type AIProviderId,
	type GenerateParams,
	type GenerateResult,
} from "../types";
import { fromHttpError, maskSensitive } from "../errors";

/** Hanya https; sangkal URL internal/berbahaya (SSRF protection). */
export function validateBaseURL(raw: string): string {
	let u: URL;
	try {
		u = new URL(raw);
	} catch {
		throw new AIError("UNSUPPORTED_PROVIDER", "openai", "Base URL tidak valid.");
	}
	if (u.protocol !== "https:") {
		throw new AIError("UNSUPPORTED_PROVIDER", "openai", "Base URL WAJIB https.");
	}
	const host = u.hostname.toLowerCase();
	// Blokir IP privat / localhost / metadata.
	if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]") {
		throw new AIError("UNSUPPORTED_PROVIDER", "openai", "Base URL menunjuk ke localhost — tidak diizinkan.");
	}
	if (/^169\.254\./.test(host) || /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
		throw new AIError("UNSUPPORTED_PROVIDER", "openai", "Base URL menunjuk ke jaringan internal/private — tidak diizinkan.");
	}
	return u.toString().replace(/\/+$/, "");
}

/** Gabungkan base URL + `/chat/completions` (normalisasi slash). */
export function chatEndpoint(baseURL: string): string {
	return `${validateBaseURL(baseURL)}/chat/completions`;
}

export class OpenAICompatibleProvider implements AIProvider {
	constructor(
		private providerId: AIProviderId,
		private defaultBaseURL: string,
	) {}

	async generate(params: GenerateParams): Promise<GenerateResult> {
		const base = params.baseURL?.trim() ? params.baseURL.trim() : this.defaultBaseURL;
		const url = chatEndpoint(base);

		const body: Record<string, unknown> = {
			model: params.model,
			messages: params.messages,
			temperature: params.temperature ?? 0.7,
			max_tokens: params.maxTokens ?? 1024,
		};
		if (params.json) body.response_format = { type: "json_object" };

		let res: Response;
		try {
			res = await fetch(url, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					authorization: `Bearer ${params.apiKey}`,
				},
				body: JSON.stringify(body),
			});
		} catch (err) {
			throw new AIError(
				"TIMEOUT",
				this.providerId,
				`Gagal menghubungi provider: ${err instanceof Error ? maskSensitive(err.message) : "network error"}`,
				true,
			);
		}

		const text = await res.text();
		if (!res.ok) {
			throw fromHttpError(this.providerId, res.status, maskSensitive(text));
		}

		let data: unknown;
		try {
			data = JSON.parse(text);
		} catch {
			throw new AIError("PROVIDER_ERROR", this.providerId, "Respon provider tidak valid (bukan JSON).", false);
		}

		const d = data as {
			choices?: { message?: { content?: string } }[];
			usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
		};
		const content = d?.choices?.[0]?.message?.content;
		if (typeof content !== "string" || !content.trim()) {
			throw new AIError("PROVIDER_ERROR", this.providerId, "Provider mengembalikan respons kosong.", false);
		}

		return {
			content: content.trim(),
			usage: d?.usage
				? {
						inputTokens: d.usage.prompt_tokens,
						outputTokens: d.usage.completion_tokens,
						totalTokens: d.usage.total_tokens,
					}
				: undefined,
			provider: this.providerId,
			model: params.model,
		};
	}
}
