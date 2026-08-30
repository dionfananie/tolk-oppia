import { createRequestHandler } from "react-router";
import { Hono } from "hono";
import { authApp } from "./api/auth";
import { chatApp } from "./api/chat";
import { providersApp } from "./api/providers";

declare module "react-router" {
	export interface AppLoadContext {
		cloudflare: {
			env: Env;
			ctx: ExecutionContext;
		};
	}
}

const requestHandler = createRequestHandler(
	() => import("virtual:react-router/server-build"),
	import.meta.env.MODE,
);

// Satu router basePath "/api" — sub-app TIDAK punya basePath sendiri (agar path tidak menumpuk).
const apiApp = new Hono<{ Bindings: Env }>().basePath("/api");
apiApp.route("/", providersApp);
apiApp.route("/", chatApp);

function handleApi(request: Request, env: Env): Promise<Response> | Response {
	const url = new URL(request.url);
	if (url.pathname.startsWith("/api/auth")) {
		return authApp.fetch(request, env);
	}
	if (url.pathname.startsWith("/api")) {
		return apiApp.fetch(request, env);
	}
	return new Response("Not Found", { status: 404 });
}

export default {
	fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (url.pathname.startsWith("/api")) {
			return handleApi(request, env);
		}
		return requestHandler(request, {
			cloudflare: { env, ctx },
		});
	},
} satisfies ExportedHandler<Env>;
