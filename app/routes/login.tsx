import { useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/login";
import { AuthShell } from "~/components/AuthShell";
import { Switch } from "~/components/Switch";

export function meta({}: Route.MetaArgs) {
	return [{ title: "Sign in · TOLK" }];
}

const FIELD_INPUT =
	"w-full rounded-[4px] border border-meta bg-paper px-3.5 py-3 text-base text-ink placeholder:text-meta transition hover:border-ink-2 focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,#3e6ae1_30%,transparent)] focus:outline-none";

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
					<label htmlFor="login-email" className="text-sm font-semibold text-ink">
						Email
					</label>
					<input
						id="login-email"
						type="email"
						autoComplete="email"
						placeholder="you@company.com"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						className={FIELD_INPUT}
					/>
				</div>
				<div className="flex flex-col gap-[7px]">
					<label htmlFor="login-password" className="text-sm font-semibold text-ink">
						Password
					</label>
					<input
						id="login-password"
						type="password"
						autoComplete="current-password"
						placeholder="Your password"
						className={FIELD_INPUT}
					/>
				</div>
				<div className="flex items-center justify-between gap-4">
					<Switch checked={remember} onChange={setRemember} label="Remember me" />
				</div>
				{error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
				<button
					type="submit"
					className="min-h-[44px] rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent-dark"
				>
					Continue
				</button>
			</form>
			<p className="mt-5 rounded-md bg-surface px-3 py-2.5 text-sm leading-relaxed text-muted">
				TOLK has no server account system yet. Everything runs in this browser, so continuing
				simply opens the app.
			</p>
		</AuthShell>
	);
}
