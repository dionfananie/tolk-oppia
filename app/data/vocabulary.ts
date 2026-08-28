import type { CategoryId } from "~/data/scenarios";

export type VocabEntry = {
	word: string;
	partOfSpeech: string;
	definition: string;
	example: string;
	category: CategoryId;
};

const W: Omit<VocabEntry, "category">[] = [
	// Daily standup
	{ word: "yesterday", partOfSpeech: "adverb", definition: "On the day before today.", example: "Yesterday I finished the login flow." },
	{ word: "today", partOfSpeech: "adverb", definition: "On this present day.", example: "Today I'm working on the payment integration." },
	{ word: "blocker", partOfSpeech: "noun", definition: "A problem preventing progress.", example: "The main blocker is the API dependency." },
	{ word: "on track", partOfSpeech: "phrase", definition: "Proceeding as planned, not behind schedule.", example: "We're on track to finish by Friday." },
	// Weekly meeting
	{ word: "deadline", partOfSpeech: "noun", definition: "The time by which something must be finished.", example: "We have a hard deadline on Friday." },
	{ word: "scope", partOfSpeech: "noun", definition: "The extent of work a project covers.", example: "Let's keep the scope tight for this release." },
	{ word: "trade-off", partOfSpeech: "noun", definition: "A balance achieved between two desirable but incompatible things.", example: "There's a trade-off between speed and quality." },
	// 1-on-1
	{ word: "workload", partOfSpeech: "noun", definition: "The amount of work assigned to someone.", example: "My workload doubled after the reorg." },
	{ word: "priorities", partOfSpeech: "noun", definition: "The things regarded as more important than others.", example: "Let's agree on priorities for the quarter." },
	{ word: "growth", partOfSpeech: "noun", definition: "The process of developing professionally.", example: "I want to talk about my growth in this role." },
	{ word: "capacity", partOfSpeech: "noun", definition: "The amount someone can hold or do.", example: "I'm at full capacity this sprint." },
	// Status update
	{ word: "risk", partOfSpeech: "noun", definition: "A situation that could cause harm or delay.", example: "The main risk is the third-party integration." },
	{ word: "timeline", partOfSpeech: "noun", definition: "A plan showing when things will happen.", example: "Here's the timeline for the next milestones." },
	{ word: "milestone", partOfSpeech: "noun", definition: "A significant point in a project's progress.", example: "The demo is our next milestone." },
	// Asking for clarification
	{ word: "clarify", partOfSpeech: "verb", definition: "To make something clearer.", example: "Could you clarify what you mean by that?" },
	{ word: "requirements", partOfSpeech: "noun", definition: "The things that must be done or provided.", example: "Can you share the requirements for this task?" },
	{ word: "expect", partOfSpeech: "verb", definition: "To regard something as likely to happen.", example: "What do you expect the outcome to be?" },
	// Giving feedback
	{ word: "impact", partOfSpeech: "noun", definition: "A marked effect or influence.", example: "The missed deadlines have an impact on the team." },
	{ word: "support", partOfSpeech: "noun", definition: "Help or assistance.", example: "I'd like to offer my support on this." },
	{ word: "concern", partOfSpeech: "noun", definition: "A worry or cause of worry.", example: "I have a concern about the timeline." },
	// Negotiation
	{ word: "compromise", partOfSpeech: "noun", definition: "An agreement reached by mutual concession.", example: "We reached a compromise on the deadline." },
	{ word: "budget", partOfSpeech: "noun", definition: "The money available for a purpose.", example: "The budget doesn't allow for an extra month." },
	{ word: "concession", partOfSpeech: "noun", definition: "Something you give up to reach an agreement.", example: "We made a small concession on pricing." },
	// Sales meeting
	{ word: "value", partOfSpeech: "noun", definition: "The worth or benefit of something.", example: "The value is in the time your team saves." },
	{ word: "pricing", partOfSpeech: "noun", definition: "The cost set for a product or service.", example: "Our pricing includes onboarding support." },
	{ word: "ROI", partOfSpeech: "noun", definition: "Return on investment; the gain from a cost.", example: "Most customers see ROI within two months." },
	{ word: "customers", partOfSpeech: "noun", definition: "People who buy a product or service.", example: "Customers ask for this feature every month." },
	// Client meeting
	{ word: "progress", partOfSpeech: "noun", definition: "Forward or onward movement toward a goal.", example: "Here's our progress on the migration." },
	{ word: "quality", partOfSpeech: "noun", definition: "The standard of something as measured against others.", example: "Quality is our first priority." },
	{ word: "assurance", partOfSpeech: "noun", definition: "A positive declaration intended to give confidence.", example: "Our QA process gives assurance on every release." },
	// Budget discussion
	{ word: "justify", partOfSpeech: "verb", definition: "To give good reasons for something.", example: "Let me justify this budget increase." },
	{ word: "efficiency", partOfSpeech: "noun", definition: "Working productively with minimum wasted effort.", example: "Better tooling improves team efficiency." },
	{ word: "investment", partOfSpeech: "noun", definition: "Spending money to gain future benefit.", example: "This is an investment in reliability." },
	// Job interview
	{ word: "experience", partOfSpeech: "noun", definition: "Practical contact with and knowledge of something.", example: "I have five years of experience in backend work." },
	{ word: "challenge", partOfSpeech: "noun", definition: "A task or situation that tests ability.", example: "The hardest challenge was a failed migration." },
	{ word: "result", partOfSpeech: "noun", definition: "The outcome of an action.", example: "As a result, the team shipped two weeks early." },
	{ word: "responsibility", partOfSpeech: "noun", definition: "The state of being accountable for something.", example: "I took responsibility for the release." },
	// Salary negotiation
	{ word: "compensation", partOfSpeech: "noun", definition: "Salary, benefits, and other payments from a job.", example: "The compensation package includes equity." },
	{ word: "range", partOfSpeech: "noun", definition: "The area of variation between limits.", example: "I'm looking for a range of 80 to 90 thousand." },
	{ word: "offer", partOfSpeech: "noun", definition: "A proposed deal or job terms.", example: "Thank you for the offer, I have a few questions." },
	{ word: "benefits", partOfSpeech: "noun", definition: "Non-salary advantages like insurance and leave.", example: "The benefits include four weeks of vacation." },
	// Self introduction
	{ word: "background", partOfSpeech: "noun", definition: "A person's education, experience, and history.", example: "My background is in data engineering." },
	{ word: "role", partOfSpeech: "noun", definition: "A function or position someone has.", example: "My role is platform engineer." },
	{ word: "looking forward", partOfSpeech: "phrase", definition: "Feeling excited about something in the future.", example: "I'm looking forward to working together." },
	// Describing a past project
	{ word: "project", partOfSpeech: "noun", definition: "A planned piece of work with a goal.", example: "The project was a customer analytics dashboard." },
	{ word: "solution", partOfSpeech: "noun", definition: "A way of solving a problem.", example: "We built a solution that cut query time in half." },
	// Small talk
	{ word: "weekend", partOfSpeech: "noun", definition: "Saturday and Sunday.", example: "How was your weekend?" },
	{ word: "hobby", partOfSpeech: "noun", definition: "An activity done regularly for pleasure.", example: "My hobby is trail running." },
	{ word: "team", partOfSpeech: "noun", definition: "A group of people working together.", example: "I just joined the mobile team." },
	{ word: "get along", partOfSpeech: "phrase", definition: "To have a friendly relationship.", example: "We get along well on the team." },
	// Disagreeing politely
	{ word: "alternative", partOfSpeech: "noun", definition: "Another possible option.", example: "I'd suggest an alternative approach." },
	{ word: "perspective", partOfSpeech: "noun", definition: "A particular way of viewing something.", example: "From a risk perspective, I have concerns." },
	// Saying no
	{ word: "commitment", partOfSpeech: "noun", definition: "A promise or duty to do something.", example: "I already have commitments this week." },
	{ word: "prioritize", partOfSpeech: "verb", definition: "To arrange things in order of importance.", example: "Let's prioritize the top two items." },
	{ word: "suggestion", partOfSpeech: "noun", definition: "An idea put forward for consideration.", example: "A suggestion would be to move the deadline." },
	// Asking for help
	{ word: "stuck", partOfSpeech: "adjective", definition: "Unable to move or make progress.", example: "I've been stuck on this bug for hours." },
	{ word: "issue", partOfSpeech: "noun", definition: "A problem or difficulty.", example: "We're having an issue with the sandbox." },
	{ word: "try", partOfSpeech: "verb", definition: "To attempt to do something.", example: "I tried the cache workaround already." },
	{ word: "appreciate", partOfSpeech: "verb", definition: "To be grateful for something.", example: "I'd appreciate your help with this." },
];

const CATEGORY_BY_WORD: Record<string, CategoryId> = {
	yesterday: "workplace", today: "workplace", blocker: "workplace", "on track": "workplace",
	deadline: "workplace", scope: "workplace", "trade-off": "business",
	workload: "workplace", priorities: "workplace", growth: "workplace", capacity: "professional",
	risk: "workplace", timeline: "workplace", milestone: "workplace",
	clarify: "workplace", requirements: "workplace", expect: "workplace",
	impact: "workplace", support: "workplace", concern: "professional",
	compromise: "business", budget: "business", concession: "business",
	value: "business", pricing: "business", ROI: "business", customers: "business",
	progress: "business", quality: "business", assurance: "business",
	justify: "business", efficiency: "business", investment: "business",
	experience: "career", challenge: "career", result: "career", responsibility: "career",
	compensation: "career", range: "career", offer: "career", benefits: "career",
	background: "career", role: "career", "looking forward": "career",
	project: "career", solution: "career",
	weekend: "professional", hobby: "professional", team: "professional", "get along": "professional",
	alternative: "professional", perspective: "professional",
	commitment: "professional", prioritize: "professional", suggestion: "professional",
	stuck: "professional", issue: "professional", try: "professional", appreciate: "professional",
};

export const VOCABULARY: VocabEntry[] = W.map((entry) => ({
	...entry,
	category: CATEGORY_BY_WORD[entry.word] ?? "workplace",
}));

export function searchVocabulary(query: string, category: "all" | CategoryId): VocabEntry[] {
	const q = query.trim().toLowerCase();
	return VOCABULARY.filter((entry) => {
		if (category !== "all" && entry.category !== category) return false;
		if (!q) return true;
		return (
			entry.word.toLowerCase().includes(q) ||
			entry.definition.toLowerCase().includes(q)
		);
	});
}
