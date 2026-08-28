import { Link } from "react-router";
import type { Route } from "./+types/home";
import { Brand } from "~/components/Brand";
import { Orb } from "~/components/Orb";
import {
	IconBriefcase,
	IconChat,
	IconInterview,
	IconList,
	IconMic,
} from "~/components/icons";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "TOLK · Practice the conversations you actually have at work" },
		{
			name: "description",
			content:
				"Improve your Business English with realistic AI roleplay. Practice meetings, negotiations, and interviews with an AI coach, then get feedback on your grammar, vocabulary, and professionalism.",
		},
	];
}

const STEPS = [
	{
		n: "1",
		title: "Pick a work scenario",
		body: "Meetings, negotiations, interviews, client calls. Replay the situations you face this week.",
	},
	{
		n: "2",
		title: "Speak with the AI",
		body: "A realistic AI partner keeps the conversation going. Type your response, or hold to talk.",
	},
	{
		n: "3",
		title: "Get precise feedback",
		body: "Corrections that explain why, plus more professional ways to say it.",
	},
];

const CATEGORY_ROWS = [
	{
		title: "Workplace",
		body: "Status updates, stand-ups, difficult conversations.",
		icon: IconChat,
	},
	{
		title: "Business",
		body: "Negotiations, client calls, follow-ups.",
		icon: IconBriefcase,
	},
	{
		title: "Presentation",
		body: "Pitches, demos, exec updates.",
		icon: IconMic,
	},
	{
		title: "Negotiation",
		body: "Salary talks, scope, deadlines.",
		icon: IconList,
	},
	{
		title: "Interview",
		body: "Behavioral questions, salary, follow-ups.",
		icon: IconInterview,
	},
	{
		title: "Client call",
		body: "Discovery calls, renewals, support escalations.",
		icon: IconChat,
	},
];

const VOICE_POINTS = [
	"Push-to-talk and free-talk modes",
	"Live captions, toggleable",
	"Replay any AI response",
];

export default function Home() {
	return (
		<div className="bg-paper text-ink">
			<header className="sticky top-0 z-[60] border-b border-paper/10 bg-ink/55 backdrop-blur">
				<div className="mx-auto flex h-14 max-w-[1024px] items-center gap-6 px-4 sm:px-6">
					<Brand dark />
					<nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
						<a href="#how-it-works" className="rounded-full px-3.5 py-2 text-sm font-semibold text-surface transition hover:bg-paper/10 hover:text-paper">
							How it works
						</a>
						<a href="#scenarios" className="rounded-full px-3.5 py-2 text-sm font-semibold text-surface transition hover:bg-paper/10 hover:text-paper">
							Scenarios
						</a>
						<a href="#voice" className="rounded-full px-3.5 py-2 text-sm font-semibold text-surface transition hover:bg-paper/10 hover:text-paper">
							Voice
						</a>
						<a href="#byok" className="rounded-full px-3.5 py-2 text-sm font-semibold text-surface transition hover:bg-paper/10 hover:text-paper">
							Your keys
						</a>
					</nav>
					<div className="ml-auto flex items-center gap-2">
						<Link to="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-paper transition hover:bg-paper/10">
							Sign in
						</Link>
						<Link
							to="/practice"
							className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-paper transition hover:bg-accent-dark"
						>
							Start practicing
						</Link>
					</div>
				</div>
			</header>

			<section className="bg-ink text-surface">
				<div className="mx-auto max-w-[1024px] px-4 pb-20 pt-[96px] text-center sm:px-6 md:pt-[132px]">
					<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-meta">
						AI Business English Coach
					</p>
					<h1 className="mx-auto mt-5 max-w-[14ch] font-display text-[clamp(40px,6vw,68px)] font-semibold leading-[1.05] tracking-[-0.015em] text-paper">
						Practice the conversations you actually have at work.
					</h1>
					<p className="mx-auto mt-6 max-w-[46ch] text-lg leading-[1.45] text-muted">
						Improve your Business English with realistic AI roleplay that listens, corrects,
						and helps you sound professional.
					</p>
					<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
						<Link
							to="/practice"
							className="inline-flex min-h-[52px] items-center rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-paper transition hover:bg-accent-dark"
						>
							Start practicing
						</Link>
						<Link
							to="/login"
							className="inline-flex min-h-[52px] items-center rounded-full border border-paper/20 bg-paper/10 px-7 py-3.5 text-base font-semibold text-paper transition hover:bg-paper/20"
						>
							I have an account
						</Link>
					</div>

					<div className="mx-auto mt-16 max-w-[560px] rounded-xl border border-paper/15 bg-paper/5 p-5 text-left sm:mt-[72px]">
						<div className="rounded-xl bg-paper/10 p-4">
							<div className="mb-1 flex items-center gap-2">
								<span className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-paper">
									You
								</span>
								<span className="rounded-full bg-paper/10 px-2 py-0.5 text-xs font-semibold text-paper">
									voice
								</span>
							</div>
							<p className="text-base leading-[1.45] text-paper">
								&ldquo;We are currently facing some problems with the API.&rdquo;
							</p>
						</div>
						<div className="mt-2.5 rounded-xl border border-paper/15 bg-transparent p-4">
							<div className="mb-1 flex items-center gap-2">
								<span className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-paper">
									Coach
								</span>
							</div>
							<p className="text-base leading-[1.45] text-paper">
								Try: &ldquo;We&rsquo;re running into some issues with the API.&rdquo;
							</p>
							<p className="mt-1 text-[13px] text-meta">
								&ldquo;Running into issues&rdquo; sounds more natural in a status update.
							</p>
						</div>
					</div>
				</div>
			</section>

			<section id="how-it-works" className="py-16 md:py-24">
				<div className="mx-auto max-w-[1024px] px-4 sm:px-6">
					<div className="mx-auto max-w-[560px] text-center">
						<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
							How it works
						</p>
						<h2 className="mt-3 font-display text-[clamp(26px,3.4vw,40px)] font-semibold tracking-[-0.015em] text-ink">
							Three minutes a day, out loud.
						</h2>
					</div>
					<div className="mt-12 grid gap-4 md:grid-cols-3">
						{STEPS.map((step) => (
							<div key={step.n} className="flex gap-4 rounded-xl border border-line bg-paper p-5">
								<span className="grid size-[34px] flex-none place-items-center rounded-full bg-ink font-mono text-sm font-bold text-paper">
									{step.n}
								</span>
								<div>
									<h3 className="text-[19px] font-semibold text-ink">{step.title}</h3>
									<p className="mt-1 text-sm leading-[1.45] text-muted">{step.body}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			<section id="scenarios" className="bg-surface py-16 md:py-24">
				<div className="mx-auto max-w-[1024px] px-4 sm:px-6">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<div className="max-w-[520px]">
							<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
								Scenarios
							</p>
							<h2 className="mt-3 font-display text-[clamp(26px,3.4vw,40px)] font-semibold tracking-[-0.015em] text-ink">
								Roleplay for the room you&rsquo;re in.
							</h2>
						</div>
						<Link to="/practice" className="text-sm font-semibold text-accent transition hover:text-accent-dark">
							Browse all scenarios
						</Link>
					</div>
					<div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{CATEGORY_ROWS.map((row) => (
							<div key={row.title} className="flex gap-4 rounded-xl border border-line bg-paper p-5">
								<span className="grid size-[34px] flex-none place-items-center rounded-full bg-ink text-paper">
									<row.icon className="size-[17px]" />
								</span>
								<div>
									<h3 className="text-[19px] font-semibold text-ink">{row.title}</h3>
									<p className="mt-1 text-sm leading-[1.45] text-muted">{row.body}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			<section id="voice" className="py-16 md:py-24">
				<div className="mx-auto grid max-w-[1024px] items-center gap-12 px-4 sm:px-6 md:grid-cols-[1.1fr_0.9fr]">
					<div>
						<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
							Voice conversation
						</p>
						<h2 className="mt-3 font-display text-[clamp(26px,3.4vw,40px)] font-semibold tracking-[-0.015em] text-ink">
							Speak, don&rsquo;t type.
						</h2>
						<p className="mt-4 text-lg leading-[1.45] text-ink-2">
							Hold to talk or speak freely. Your coach listens, responds out loud, and
							streams the captions when you want them.
						</p>
						<ul className="mt-6 flex flex-col gap-2.5">
							{VOICE_POINTS.map((point) => (
								<li key={point} className="flex items-center gap-3 text-ink-2">
									<span className="size-[6px] flex-none rounded-full bg-accent" />
									{point}
								</li>
							))}
						</ul>
						<Link
							to="/practice"
							className="mt-7 inline-flex min-h-[44px] items-center rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent-dark"
						>
							Try a conversation
						</Link>
					</div>
					<div className="grid place-items-center">
						<Orb name="Coach" sub="AI roleplay" state="idle" className="size-[190px]" />
					</div>
				</div>
			</section>

			<section id="feedback" className="bg-surface py-16 md:py-24">
				<div className="mx-auto grid max-w-[1024px] items-center gap-12 px-4 sm:px-6 md:grid-cols-[1.1fr_0.9fr]">
					<div className="order-2 md:order-1">
						<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
							Example feedback
						</p>
						<h2 className="mt-3 font-display text-[clamp(26px,3.4vw,40px)] font-semibold tracking-[-0.015em] text-ink">
							Not just corrections. Why.
						</h2>
						<p className="mt-4 text-lg leading-[1.45] text-ink-2">
							Every session ends with feedback that teaches you to sound professional, not
							just grammatically correct.
						</p>
					</div>
					<div className="order-1 rounded-xl border border-line bg-paper p-6 md:order-2">
						<p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">You said</p>
						<blockquote className="mt-1 text-base leading-[1.45] text-ink">
							&ldquo;I don&rsquo;t think this solution is good.&rdquo;
						</blockquote>
						<p className="mt-5 text-xs font-semibold uppercase tracking-[0.1em] text-muted">Better</p>
						<blockquote className="mt-1 text-base font-medium leading-[1.45] text-accent-dark">
							&ldquo;I have some concerns about this approach.&rdquo;
						</blockquote>
						<p className="mt-5 text-xs font-semibold uppercase tracking-[0.1em] text-muted">More executive</p>
						<blockquote className="mt-1 text-base font-medium leading-[1.45] text-accent-dark">
							&ldquo;I don&rsquo;t think this approach is ideal given our current constraints.&rdquo;
						</blockquote>
						<p className="mt-5 border-t border-line-soft pt-4 text-sm leading-[1.45] text-muted">
							Sounds more confident, and it focuses on the approach instead of the person.
						</p>
					</div>
				</div>
			</section>

			<section id="byok" className="py-16 md:py-24">
				<div className="mx-auto max-w-[760px] px-4 text-center sm:px-6">
					<div className="rounded-xl bg-surface p-10 sm:p-12">
						<p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
							Your keys, your data
						</p>
						<h2 className="mt-3 font-display text-[clamp(26px,3.4vw,40px)] font-semibold tracking-[-0.015em] text-ink">
							Bring your own AI provider.
						</h2>
						<p className="mx-auto mt-4 max-w-[52ch] text-lg leading-[1.45] text-ink-2">
							Connect your own LLM key. DeepSeek or GLM, whatever you already pay for.
							Conversations stay in your browser.
						</p>
						<Link
							to="/settings"
							className="mt-7 inline-flex min-h-[44px] items-center rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent-dark"
						>
							See supported providers
						</Link>
					</div>
				</div>
			</section>

			<section className="bg-ink text-surface">
				<div className="mx-auto max-w-[1024px] px-4 py-24 text-center sm:px-6">
					<h2 className="font-display text-[clamp(30px,4vw,44px)] font-semibold tracking-[-0.015em] text-paper">
						Your next meeting starts now.
					</h2>
					<p className="mx-auto mt-5 max-w-[44ch] text-lg leading-[1.45] text-muted">
						Start free. No credit card, and no AI key required to try it.
					</p>
					<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
						<Link
							to="/practice"
							className="inline-flex min-h-[52px] items-center rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-paper transition hover:bg-accent-dark"
						>
							Start practicing
						</Link>
						<Link
							to="/practice"
							className="inline-flex min-h-[52px] items-center rounded-full border border-paper/20 bg-paper/10 px-7 py-3.5 text-base font-semibold text-paper transition hover:bg-paper/20"
						>
							Browse scenarios
						</Link>
					</div>
				</div>
			</section>

			<footer className="border-t border-line-soft bg-surface-warm py-12">
				<div className="mx-auto flex max-w-[1024px] flex-wrap items-center justify-between gap-6 px-4 sm:px-6">
					<p className="text-sm text-muted">TOLK · AI Business English Coach</p>
					<div className="flex gap-6 text-sm font-semibold">
						<a href="#how-it-works" className="text-ink-2 transition hover:text-ink">
							How it works
						</a>
						<a href="#byok" className="text-ink-2 transition hover:text-ink">
							Privacy
						</a>
						<Link to="/login" className="text-ink-2 transition hover:text-ink">
							Sign in
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}
