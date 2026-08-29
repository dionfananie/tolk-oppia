import { createRequestHandler } from "react-router";
import { authApp } from "./api/auth";
import { chatApp } from "./api/chat";

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

// Gabungkan Hono auth + chat ke satu router ringan per prefix.
// authApp sudah basePath("/api/auth"), chatApp basePath("/api").
function handleApi(request: Request, env: Env): Promise<Response> | Response {
	const url = new URL(request.url);
	if (url.pathname.startsWith("/api/auth")) {
		return authApp.fetch(request, env);
	}
	if (url.pathname.startsWith("/api/")) {
		return chatApp.fetch(request, env);
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
