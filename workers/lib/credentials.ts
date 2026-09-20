import { decryptKey } from "./crypto";
import { getOrCreateEntitlement, type Entitlement } from "./entitlements";

type CredentialRow = {
	encrypted_api_key: string;
	iv: string;
	base_url: string | null;
	default_model: string | null;
};

export type ResolvedCredential = {
	owner: "user" | "platform";
	provider: string;
	model: string;
	baseURL?: string;
	apiKey: string;
	entitlement: Entitlement;
};

async function findCredential(
	db: D1Database,
	table: "user_ai_credentials" | "platform_credentials",
	userId: string | null,
	provider: string,
): Promise<CredentialRow | null> {
	const query = userId
		? `SELECT encrypted_api_key, iv, base_url, default_model FROM ${table} WHERE user_id = ? AND provider = ?`
		: `SELECT encrypted_api_key, iv, base_url, default_model FROM ${table} WHERE provider = ? AND enabled = 1`;
	const statement = userId ? db.prepare(query).bind(userId, provider) : db.prepare(query).bind(provider);
	return statement.first<CredentialRow>();
}

export async function resolveCredential(
	db: D1Database,
	masterKey: string,
	userId: string,
	provider: string,
	model: string,
): Promise<ResolvedCredential | null> {
	const entitlement = await getOrCreateEntitlement(db, userId);
	const hosted = entitlement.planId === "core" || entitlement.planId === "voice";
	if (hosted && entitlement.status !== "active") return null;

	const owner = hosted ? "platform" : "user";
	const row = await findCredential(db, hosted ? "platform_credentials" : "user_ai_credentials", hosted ? null : userId, provider);
	if (!row) return null;

	return {
		owner,
		provider,
		model: model || row.default_model || "",
		baseURL: row.base_url ?? undefined,
		apiKey: await decryptKey(row.encrypted_api_key, row.iv, masterKey),
		entitlement,
	};
}
