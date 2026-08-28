import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("login", "routes/login.tsx"),
	route("signup", "routes/signup.tsx"),
	route("app", "routes/dashboard.tsx"),
	route("practice", "routes/scenarios.tsx"),
	route("practice/:scenarioId/setup", "routes/practice-setup.tsx"),
	route("practice/:scenarioId", "routes/practice.tsx"),
	route("complete/:sessionId", "routes/complete.tsx"),
	route("results/:sessionId", "routes/results.tsx"),
	route("progress", "routes/progress.tsx"),
	route("history", "routes/history.tsx"),
	route("vocabulary", "routes/vocabulary.tsx"),
	route("daily-challenge", "routes/daily-challenge.tsx"),
	route("settings", "routes/settings.tsx"),
] satisfies RouteConfig;
