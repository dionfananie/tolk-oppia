import { useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/signup";
import { AuthShell } from "~/components/AuthShell";

export function meta({}: Route.MetaArgs) {
	return [{ title: "Create your account · TOLK" }];
}

const FIELD_INPUT =
	"w-full rounded-[4px] border border-meta bg-paper px-3.5 py-3 text-base text-ink placeholder:text-meta transition hover:border-ink-2 focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,#3e6ae1_30%,transparent)] focus:outline-none";

export default function Signup() {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);

	function submit(event: React.FormEvent) {
		event.preventDefault();
		if (!name.trim()) {
			setError("Enter your name.");
			return;
		}
		if (!email.trim() || !email.includes("@")) {
			setError("Enter a valid email address.");
			return;
		}
		setError(null);
		navigate("/app");
	}

	return (
		<AuthShell
			title="Create your account"
			sub="Free to start. No AI key required."
			asideHref="/login"
			asideLabel="Sign in"
			altText="Already have an account?"
			altHref="/login"
			altLink="Sign in"
		>
			<form onSubmit={submit} className="mt-6 flex flex-col gap-4">
				<div className="flex flex-col gap-[7px]">
					<label htmlFor="su-name" className="text-sm font-semibold text-ink">
						Name
					</label>
					<input
						id="su-name"
						type="text"
						autoComplete="name"
						placeholder="Your name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						className={FIELD_INPUT}
					/>
				</div>
				<div className="flex flex-col gap-[7px]">
					<label htmlFor="su-email" className="text-sm font-semibold text-ink">
						Email
					</label>
					<input
						id="su-email"
						type="email"
						autoComplete="email"
						placeholder="you@company.com"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						className={FIELD_INPUT}
					/>
				</div>
				<div className="flex flex-col gap-[7px]">
					<label htmlFor="su-password" className="text-sm font-semibold text-ink">
						Password
					</label>
					<input
						id="su-password"
						type="password"
						autoComplete="new-password"
						placeholder="At least 8 characters"
						className={FIELD_INPUT}
					/>
				</div>
				{error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
				<button
					type="submit"
					className="min-h-[44px] rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent-dark"
				>
					Create Account
				</button>
			</form>
			<p className="mt-5 rounded-md bg-surface px-3 py-2.5 text-sm leading-relaxed text-muted">
				TOLK has no server account system yet. Everything runs in this browser, so creating an
				account simply opens the app.
			</p>
		</AuthShell>
	);
}
