import { Hono } from "hono";
import { getSessionUser } from "../lib/session";
import { getOrCreateEntitlement } from "../lib/entitlements";

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});

export const billingApp = new Hono<{ Bindings: Env }>();

// GET /api/billing/me — current plan and prepaid voice balance.
billingApp.get("/billing/me", async (c) => {
	const userId = await getSessionUser(c.env.tolk_db, c.req.raw);
	if (!userId) return json({ error: "unauthorized" }, 401);

	const entitlement = await getOrCreateEntitlement(c.env.tolk_db, userId);
	return json({
		plan: entitlement.planId,
		status: entitlement.status,
		voiceSecondsBalance: entitlement.voiceSecondsBalance,
		voiceMinutesBalance: Math.floor(entitlement.voiceSecondsBalance / 60),
		currentPeriodStart: entitlement.currentPeriodStart,
		currentPeriodEnd: entitlement.currentPeriodEnd,
	});
});
