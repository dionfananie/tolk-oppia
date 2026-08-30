// router.ts — Provider Router: pilih adapter berdasarkan provider yg dipilih user,
// teruskan GenerateParams, kembalikan GenerateResult ter-normalisasi. Juga testKey()
// utk validasi API key saat disimpan (server-side, jangan andalkan format string).

import {
	AIError,
	type AIProvider,
	type AIProviderId,
	type GenerateParams,
	type GenerateResult,
} from "./types";
import { getProvider, getProviderModels, providerNames } from "./registry";
import { OpenAICompatibleProvider } from "./providers/openai-compatible";

const CACHE = new Map<string, AIProvider>();

function getAdapter(providerId: AIProviderId): AIProvider {
	const cached = CACHE.get(providerId);
	if (cached) return cached;

	const cfg = getProvider(providerId);
	if (!cfg) {
		throw new AIError(
			"UNSUPPORTED_PROVIDER",
			providerId,
			`Provider "${providerId}" tidak didukung.`,
			false,
		);
	}

	let adapter: AIProvider;
	if (cfg.adapter === "openai-compatible") {
		adapter = new OpenAICompatibleProvider(providerId, cfg.baseURL ?? `https://${providerId}.example.com/v1`);
	} else {
		throw new AIError(
			"UNSUPPORTED_PROVIDER",
			providerId,
			`Adapter "${cfg.adapter}" belum diimplementasikan.`,
			false,
		);
	}

	CACHE.set(providerId, adapter);
	return adapter;
}

/** Generate utk `provider` yang dipilih user (key dari DB ter-enkripsi, di-decrypt di endpoint). */
export async function generate(
	provider: AIProviderId,
	params: GenerateParams,
): Promise<GenerateResult> {
	return getAdapter(provider).generate(params);
}

/** Validasi API key: kirim 1 pesan chat minimal. Return true bila request sukses (2xx). */
export async function testKey(
	provider: AIProviderId,
	apiKey: string,
	model: string,
	baseURL?: string,
): Promise<boolean> {
	const result = await generate(provider, {
		apiKey,
		model,
		baseURL,
		temperature: 0,
		maxTokens: 64,
		messages: [{ role: "user", content: "Reply with the single word: ok" }],
	});
	return typeof result.content === "string" && result.content.length > 0;
}

/** Daftar id+defaultModel utk dropdown; dipakai endpoint /api/providers (public, tanpa key). */
export function providerCatalog() {
	return [...new Set(providerNames())].map((p) => ({
		...p,
		defaultBaseURL: getProvider(p.id)?.baseURL ?? null,
		models: getProviderModels(p.id).map((m) => ({ id: m.id, name: m.name })),
	}));
}

// Re-export helpers yang dibutuhkan endpoint lain.
export { OpenAICompatibleProvider };
