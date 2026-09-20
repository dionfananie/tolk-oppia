import { Link } from "react-router";
import type { Route } from "./+types/pricing";
import { AccountMenu } from "~/components/AppShell";
import { Brand } from "~/components/Brand";
import { Button } from "~/components/Button";
import { ThemeToggle } from "~/components/ThemeToggle";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Pricing · TOLK" },
		{
			name: "description",
			content: "Choose how you want to power your Business English practice with TOLK.",
		},
	];
}

const PLANS = [
	{
		name: "Free",
		label: "BYOK",
		price: "Rp0",
		detail: "Selamanya",
		body: "Untuk yang sudah punya API key sendiri dan ingin mulai tanpa biaya platform.",
		features: ["Pakai API key milik sendiri", "Practice skenario kerja", "Feedback grammar dan vocabulary"],
		cta: "Start for free",
		to: "/practice",
	},
	{
		name: "Core",
		label: "AI + Web Speech",
		price: "Rp29.000",
		detail: "per bulan · placeholder",
		body: "DeepSeek AI siap pakai tanpa perlu mengatur API key. Voice memakai Web Speech bawaan browser.",
		features: ["DeepSeek AI disediakan TOLK", "Native Web Speech", "Practice dan feedback tanpa setup provider"],
		cta: "Coming soon",
	},
	{
		name: "Voice",
		label: "DeepSeek + Deepgram Voice",
		price: "Rp60.000",
		detail: "per 2 jam voice · placeholder",
		body: "DeepSeek AI dengan saldo 2 jam voice yang bisa dipakai bebas dan dipecah ke beberapa sesi kapan pun.",
		features: ["Semua fitur Core", "Deepgram speech-to-text dan text-to-speech", "120 menit voice fleksibel", "Sisa menit tersimpan antar sesi"],
		cta: "Coming soon",
		highlighted: true,
	},
];

export default function Pricing() {
	return (
		<div className="min-h-dvh bg-base-100 text-base-content">
			<header className="sticky top-0 z-[60] border-b border-base-300 bg-base-100/90 backdrop-blur">
				<div className="mx-auto flex h-14 max-w-[1024px] items-center gap-5 px-4 sm:px-6">
					<Brand to="/" />
					<nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
						<Link to="/" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-base-content/70 hover:bg-base-200 hover:text-base-content">
							Home
						</Link>
						<Link to="/pricing" aria-current="page" className="rounded-lg bg-primary/15 px-3.5 py-2 text-sm font-semibold text-primary">
							Pricing
						</Link>
					</nav>
					<div className="ml-auto flex items-center gap-2">
						<Button to="/practice">Start practicing</Button>
						<ThemeToggle />
						<AccountMenu />
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-[1120px] px-4 pb-24 pt-14 sm:px-6 md:pt-20">
				<section className="mx-auto max-w-[680px] text-center">
					<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">Simple pricing</p>
					<h1 className="mt-4 font-display text-[clamp(38px,6vw,64px)] font-semibold leading-[1.05] tracking-[-0.02em]">
						Choose your way to practice.
					</h1>
					<p className="mx-auto mt-5 max-w-[54ch] text-base leading-7 text-base-content/65 sm:text-lg">
						Pakai key sendiri secara gratis, atau biarkan TOLK menyiapkan AI untuk Anda.
					</p>
				</section>

				<section aria-label="Pricing plans" className="mx-auto mt-12 grid max-w-[1120px] gap-4 lg:grid-cols-3">
					{PLANS.map((plan) => (
						<article
							key={plan.name}
							className={`flex flex-col rounded-2xl border p-6 sm:p-7 ${
								plan.highlighted ? "border-primary bg-primary/[0.07] shadow-md" : "border-base-300 bg-base-100"
							}`}
						>
							<div>
								<div className="flex items-baseline justify-between gap-3">
									<h2 className="font-display text-2xl font-semibold">{plan.name}</h2>
									<span className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-base-content/55">{plan.label}</span>
								</div>
								<p className="mt-7 font-display text-4xl font-semibold tracking-tight">{plan.price}</p>
								<p className="mt-1 text-sm text-base-content/55">{plan.detail}</p>
								<p className="mt-6 min-h-20 text-sm leading-6 text-base-content/70">{plan.body}</p>
								<ul className="mt-6 space-y-3 border-t border-base-300 pt-6 text-sm leading-6">
									{plan.features.map((feature) => (
										<li key={feature} className="flex gap-3">
											<span className="mt-2 size-1.5 flex-none rounded-full bg-primary" aria-hidden="true" />
											<span>{feature}</span>
										</li>
									))}
								</ul>
							</div>
							{plan.to ? (
								<Button to={plan.to} className="mt-8 w-full justify-center">{plan.cta}</Button>
							) : (
								<button type="button" disabled className="mt-8 min-h-11 w-full cursor-not-allowed rounded-lg border border-base-300 px-4 py-3 text-sm font-semibold text-base-content/45">
									{plan.cta}
								</button>
							)}
						</article>
					))}
				</section>

				<p className="mx-auto mt-8 max-w-[720px] text-center text-sm leading-6 text-base-content/55">
					Harga dan pembayaran paket berbayar akan dibuka setelah sistem subscription dan usage tracking siap.
				</p>
			</main>
		</div>
	);
}
