import { decryptKey } from "./crypto";

type PlatformCredentialRow = {
	scope: "llm" | "voice";
	provider: string;
	default_model: string | null;
	stt_model: string | null;
	tts_model: string | null;
	base_url: string | null;
	encrypted_api_key: string;
	iv: string;
};

export type PlatformCredential = {
	owner: "platform";
	scope: "llm" | "voice";
	provider: string;
	model: string;
	baseURL?: string;
	apiKey: string;
};

async function findPlatformCredential(db: D1Database, scope: "llm" | "voice"): Promise<PlatformCredentialRow | null> {
	try {
		return await db.prepare(`SELECT scope, provider, default_model, stt_model, tts_model, base_url, encrypted_api_key, iv FROM platform_credentials_v2 WHERE scope = ? AND enabled = 1`)
			.bind(scope)
			.first<PlatformCredentialRow>();
	} catch {
		return null;
	}
}

export async function resolvePlatformLLM(db: D1Database, masterKey: string): Promise<PlatformCredential | null> {
	const row = await findPlatformCredential(db, "llm");
	if (!row) return null;
	return {
		owner: "platform",
		scope: "llm",
		provider: "deepseek",
		model: row.default_model || "deepseek-v4-flash",
		baseURL: row.base_url ?? undefined,
		apiKey: await decryptKey(row.encrypted_api_key, row.iv, masterKey),
	};
}

export async function resolvePlatformVoice(db: D1Database, masterKey: string, kind: "stt" | "tts"): Promise<PlatformCredential | null> {
	const row = await findPlatformCredential(db, "voice");
	if (!row) return null;
	return {
		owner: "platform",
		scope: "voice",
		provider: "alibaba",
		model: kind === "stt" ? row.stt_model || "qwen3-asr-flash" : row.tts_model || "qwen3-tts-flash",
		baseURL: row.base_url ?? undefined,
		apiKey: await decryptKey(row.encrypted_api_key, row.iv, masterKey),
	};
}
