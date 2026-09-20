export type PlanId = "byok" | "core" | "voice";
export type CredentialOwner = "user" | "platform";
export type EntitlementStatus = "active" | "past_due" | "cancelled" | "expired";

export type Entitlement = {
	userId: string;
	planId: PlanId;
	status: EntitlementStatus;
	voiceSecondsBalance: number;
	currentPeriodStart: number | null;
	currentPeriodEnd: number | null;
};

type EntitlementRow = {
	user_id: string;
	plan_id: string;
	status: string;
	voice_seconds_balance: number;
	current_period_start: number | null;
	current_period_end: number | null;
};

export function asPlanId(value: string): PlanId {
	return value === "core" || value === "voice" ? value : "byok";
}

function asStatus(value: string): EntitlementStatus {
	return value === "past_due" || value === "cancelled" || value === "expired" ? value : "active";
}

function mapRow(row: EntitlementRow): Entitlement {
	return {
		userId: row.user_id,
		planId: asPlanId(row.plan_id),
		status: asStatus(row.status),
		voiceSecondsBalance: Math.max(0, row.voice_seconds_balance),
		currentPeriodStart: row.current_period_start,
		currentPeriodEnd: row.current_period_end,
	};
}

export async function getOrCreateEntitlement(db: D1Database, userId: string): Promise<Entitlement> {
	const existing = await db
		.prepare(
			`SELECT user_id, plan_id, status, voice_seconds_balance,
				current_period_start, current_period_end
			 FROM user_entitlements WHERE user_id = ?`,
		)
		.bind(userId)
		.first<EntitlementRow>();
	if (existing) return mapRow(existing);

	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			`INSERT OR IGNORE INTO user_entitlements
			 (user_id, plan_id, status, voice_seconds_balance, updated_at)
			 VALUES (?, 'byok', 'active', 0, ?)`,
		)
		.bind(userId, now)
		.run();

	const created = await db
		.prepare(
			`SELECT user_id, plan_id, status, voice_seconds_balance,
				current_period_start, current_period_end
			 FROM user_entitlements WHERE user_id = ?`,
		)
		.bind(userId)
		.first<EntitlementRow>();
	if (!created) throw new Error("Could not create user entitlement");
	return mapRow(created);
}

export function isHostedPlan(planId: PlanId): boolean {
	return planId === "core" || planId === "voice";
}

export function credentialOwnerForPlan(planId: PlanId): CredentialOwner {
	return isHostedPlan(planId) ? "platform" : "user";
}

export async function reserveVoiceSeconds(
	db: D1Database,
	userId: string,
	seconds: number,
): Promise<boolean> {
	const quantity = Math.ceil(seconds);
	if (!Number.isFinite(quantity) || quantity <= 0) return false;
	const result = await db
		.prepare(
			`UPDATE user_entitlements
			 SET voice_seconds_balance = voice_seconds_balance - ?, updated_at = ?
			 WHERE user_id = ? AND plan_id = 'voice' AND status = 'active'
			 AND voice_seconds_balance >= ?`,
		)
		.bind(quantity, Math.floor(Date.now() / 1000), userId, quantity)
		.run();
	return (result.meta?.changes ?? 0) === 1;
}

export async function recordUsage(
	db: D1Database,
	input: {
		userId: string;
		planId: PlanId;
		kind: "chat" | "voice";
		quantity: number;
		unit: "request" | "second" | "token";
		provider?: string;
		model?: string;
		metadata?: Record<string, unknown>;
	},
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO usage_events
			 (user_id, plan_id, kind, quantity, unit, provider, model, metadata_json, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			input.userId,
			input.planId,
			input.kind,
			Math.ceil(input.quantity),
			input.unit,
			input.provider ?? null,
			input.model ?? null,
			input.metadata ? JSON.stringify(input.metadata) : null,
			Math.floor(Date.now() / 1000),
		)
		.run();
}
