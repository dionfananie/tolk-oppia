import { useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/signup";
import { AuthShell } from "~/components/AuthShell";
import { Button } from "~/components/Button";
import { inputClass } from "~/lib/ui";

export function meta({}: Route.MetaArgs) {
	return [{ title: "Create your account · TOLK" }];
}

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
					<label htmlFor="su-name" className="text-sm font-medium text-ink">
						Name
					</label>
					<input
						id="su-name"
						type="text"
						autoComplete="name"
						placeholder="Your name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						className={inputClass}
					/>
				</div>
				<div className="flex flex-col gap-[7px]">
					<label htmlFor="su-email" className="text-sm font-medium text-ink">
						Email
					</label>
					<input
						id="su-email"
						type="email"
						autoComplete="email"
						placeholder="you@company.com"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						className={inputClass}
					/>
				</div>
				<div className="flex flex-col gap-[7px]">
					<label htmlFor="su-password" className="text-sm font-medium text-ink">
						Password
					</label>
					<input
						id="su-password"
						type="password"
						autoComplete="new-password"
						placeholder="At least 8 characters"
						className={inputClass}
					/>
				</div>
				{error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
				<Button type="submit" size="lg">
					Create Account
				</Button>
			</form>
			<p className="mt-5 rounded-md bg-surface px-3 py-2.5 text-sm leading-relaxed text-muted">
				TOLK has no server account system yet. Everything runs in this browser, so creating an
				account simply opens the app.
			</p>
		</AuthShell>
	);
}
