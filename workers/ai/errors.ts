// errors.ts — Normalisasi error dari berbagai provider menjadi AIError internal.
// Frontend cukup menangani AIErrorCode (Invalid Key / Rate Limited / Insufficient / Models / dll).

import { AIError, type AIProviderId } from "./types";

/**
 * Coba terjemahkan HTTP status + optional response body dari respon provider
 * menjadi AIError yang retryable & berkode jelas. Fallback ke PROVIDER_ERROR.
 */
export function fromHttpError(
	provider: AIProviderId,
	status: number,
	bodyText: string,
): AIError {
	let message = sanitize(bodyText);
	const low = message.toLowerCase();

	// Rate limited (banyak provider pakai 429, kodinya `rate_limit_exceeded` / `429`).
	if (status === 429 || /rate.?limit|too many requests|429/i.test(low)) {
		return new AIError("RATE_LIMITED", provider, "The provider is rate limiting requests.", true);
	}
	// Auth gagal: 401/403, atau body menyebut api key / unauthorized / forbidden.
	if (
		status === 401 ||
		status === 403 ||
		/low.credit|quota|insufficient|no credit/.test(low)
	) {
		if (/insufficient.?credit|quota|billing|payment/i.test(low)) {
			return new AIError("INSUFFICIENT_CREDITS", provider, "The provider account is out of credits or has a billing problem.", false);
		}
		return new AIError("INVALID_API_KEY", provider, "The API key is invalid or not authorized for this model.", false);
	}
	// Model tidak ditemukan: body menyebut model, atau 400 kadang karena model.
	if (status === 404 || /model.?not.?found|no such model|invalid.?model/i.test(low)) {
		return new AIError("MODEL_NOT_FOUND", provider, "The selected model is not available on this provider.", false);
	}
	if (status === 408 || status === 504) {
		return new AIError("TIMEOUT", provider, "The provider timed out.", true);
	}
	return new AIError(
		"PROVIDER_ERROR",
		provider,
		typeof message === "string" && message.trim() ? message : `HTTP ${status} from the provider.`,
		status >= 500,
	);
}

/** Jangan pernah bocorkan detail sensitif/raw dari provider ke frontend secara berlebihan. */
export function sanitize(text: string, max = 300): string {
	if (!text) return "";
	const t = text.replace(/\s+/g, " ").trim();
	return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** Cek apakah string tampak seperti API key berharga yang musti di-mask di pesan error. */
export function maskSensitive(value: string): string {
	const apiKeyPatterns = [
		/sk-[A-Za-z0-9_-]{8,}/g,
		/gsk_[A-Za-z0-9_-]{8,}/g,
		/E[A-Za-z0-9_-]{12,}/g,
		/AIza[A-Za-z0-9_-]{10,}/g,
	];
	let out = value;
	for (const re of apiKeyPatterns) out = out.replace(re, "sk-…");
	return out;
}
