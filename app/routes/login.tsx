import { useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/login";
import { AuthShell } from "~/components/AuthShell";
import { Button } from "~/components/Button";
import { Switch } from "~/components/Switch";
import { inputClass } from "~/lib/ui";

export function meta({}: Route.MetaArgs) {
	return [{ title: "Sign in · TOLK" }];
}

export default function Login() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [remember, setRemember] = useState(true);
	const [error, setError] = useState<string | null>(null);

	function submit(event: React.FormEvent) {
		event.preventDefault();
		if (!email.trim() || !email.includes("@")) {
			setError("Enter a valid email address to continue.");
			return;
		}
		setError(null);
		navigate("/app");
	}

	return (
		<AuthShell
			title="Welcome back"
			sub="Pick up where you left off."
			asideHref="/signup"
			asideLabel="Create account"
			altText="New here?"
			altHref="/signup"
			altLink="Create an account"
		>
			<form onSubmit={submit} className="mt-6 flex flex-col gap-4">
				<div className="flex flex-col gap-[7px]">
					<label htmlFor="login-email" className="text-sm font-medium text-ink">
						Email
					</label>
					<input
						id="login-email"
						type="email"
						autoComplete="email"
						placeholder="you@company.com"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						className={inputClass}
					/>
				</div>
				<div className="flex flex-col gap-[7px]">
					<label htmlFor="login-password" className="text-sm font-medium text-ink">
						Password
					</label>
					<input
						id="login-password"
						type="password"
						autoComplete="current-password"
						placeholder="Your password"
						className={inputClass}
					/>
				</div>
				<Switch checked={remember} onChange={setRemember} label="Remember me" id="login-remember" />
				{error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
				<Button type="submit" size="lg">
					Continue
				</Button>
			</form>
			<p className="mt-5 rounded-md bg-surface px-3 py-2.5 text-sm leading-relaxed text-muted">
				TOLK has no server account system yet. Everything runs in this browser, so continuing
				simply opens the app.
			</p>
		</AuthShell>
	);
}
