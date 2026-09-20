import { decryptKey } from "./crypto";

type UserCredentialRow = {
	encrypted_api_key: string;
	iv: string;
	base_url: string | null;
	default_model: string | null;
};

export type UserCredential = {
	owner: "user";
	provider: string;
	model: string;
	baseURL?: string;
	apiKey: string;
};

export async function resolveUserCredential(
	db: D1Database,
	masterKey: string,
	userId: string,
	provider: string,
	model = "",
): Promise<UserCredential | null> {
	const row = await db
		.prepare(`SELECT encrypted_api_key, iv, base_url, default_model FROM user_ai_credentials WHERE user_id = ? AND provider = ?`)
		.bind(userId, provider)
		.first<UserCredentialRow>();
	if (!row) return null;
	return {
		owner: "user",
		provider,
		model: model || row.default_model || "",
		baseURL: row.base_url ?? undefined,
		apiKey: await decryptKey(row.encrypted_api_key, row.iv, masterKey),
	};
}
