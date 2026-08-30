// providers.ts — Endpoint public: katalog provider + model utk dropdown frontend (TANPA key).
// Frontend menarik list provider/model dari sini, jadi menambah provider/model baru
// cukup update registry di backend (tanpa perlu deploy UI).

import { Hono } from "hono";
import { providerCatalog } from "../ai/router";

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});

// Mount ke apiApp (basePath "/api") di workers/app.ts — jangan basePath sendiri di sini.
export const providersApp = new Hono<{ Bindings: Env }>();

// (mounted sbg /api/providers via apiApp)
providersApp.get("/providers", (c) => {
	return json({ providers: providerCatalog() });
});
