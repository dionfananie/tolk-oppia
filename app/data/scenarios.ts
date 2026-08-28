export type EnglishLevel = "beginner" | "intermediate" | "advanced";

export const ENGLISH_LEVELS: { id: EnglishLevel; label: string; description: string }[] = [
	{
		id: "beginner",
		label: "Beginner",
		description: "I can handle basic conversations but want to improve my confidence.",
	},
	{
		id: "intermediate",
		label: "Intermediate",
		description: "I can hold conversations but make mistakes and sometimes get stuck.",
	},
	{
		id: "advanced",
		label: "Advanced",
		description: "I'm comfortable speaking and want to sound more polished and natural.",
	},
];

export type CategoryId = "workplace" | "business" | "career" | "professional";

export const CATEGORIES: { id: CategoryId; label: string; description: string }[] = [
	{ id: "workplace", label: "Workplace", description: "Meetings, standups, feedback, and everyday office life." },
	{ id: "business", label: "Business", description: "Negotiation, sales, client meetings, and budgets." },
	{ id: "career", label: "Career", description: "Interviews, salary talks, and describing your experience." },
	{ id: "professional", label: "Communication", description: "Small talk, disagreeing politely, saying no, and conflict." },
];

export type Scenario = {
	id: string;
	title: string;
	category: CategoryId;
	difficulty: EnglishLevel;
	userRole: string;
	aiRole: string;
	objective: string;
	context: string;
	constraints: string[];
	targetVocabulary: string[];
	durationMin: number;
};

export const SCENARIOS: Scenario[] = [
	{
		id: "daily-standup",
		title: "Daily Standup",
		category: "workplace",
		difficulty: "beginner",
		userRole: "Software Engineer",
		aiRole: "Engineering Manager",
		objective: "Give a clear daily standup update: what you did yesterday, what you're doing today, and any blockers.",
		context: "It's 9:30 AM and your team is doing the daily standup. The manager goes around the room one by one. It's your turn to speak.",
		constraints: ["Keep it under one minute", "Mention a blocker if you have one"],
		targetVocabulary: ["yesterday", "today", "blocker", "on track"],
		durationMin: 5,
	},
	{
		id: "weekly-meeting",
		title: "Weekly Engineering Meeting",
		category: "workplace",
		difficulty: "intermediate",
		userRole: "Software Engineer",
		aiRole: "Engineering Manager",
		objective: "Explain why the project is delayed and propose a realistic new timeline.",
		context: "Your feature is two weeks behind schedule. The manager asks why the project is delayed and what you plan to do about it.",
		constraints: ["Take ownership without making excuses", "Propose a concrete plan"],
		targetVocabulary: ["blocker", "deadline", "scope", "trade-off"],
		durationMin: 10,
	},
	{
		id: "one-on-one",
		title: "1-on-1 with Your Manager",
		category: "workplace",
		difficulty: "intermediate",
		userRole: "Team Member",
		aiRole: "Manager",
		objective: "Discuss your workload and career growth, and ask for clearer priorities.",
		context: "You have a scheduled 1-on-1 with your manager. You've been feeling overloaded and want to talk about your priorities and growth.",
		constraints: ["Be honest but constructive", "Ask at least one direct question"],
		targetVocabulary: ["workload", "priorities", "growth", "capacity"],
		durationMin: 8,
	},
	{
		id: "status-update",
		title: "Project Status Update",
		category: "workplace",
		difficulty: "intermediate",
		userRole: "Software Engineer",
		aiRole: "Stakeholder / Product Manager",
		objective: "Report the progress of your feature to stakeholders in plain, non-technical language.",
		context: "A stakeholder asks how the new feature is going. They don't care about technical details; they want to know when it will be ready and whether there are risks.",
		constraints: ["Avoid heavy jargon", "Be clear about risks and timelines"],
		targetVocabulary: ["on track", "risk", "timeline", "milestone"],
		durationMin: 8,
	},
	{
		id: "asking-clarification",
		title: "Asking for Clarification",
		category: "workplace",
		difficulty: "beginner",
		userRole: "Software Engineer",
		aiRole: "Senior Engineer",
		objective: "Ask clear follow-up questions when a task is ambiguous.",
		context: "A senior engineer describes a task to you, but the requirements are vague. You need to ask questions before you can start.",
		constraints: ["Ask at least three clarifying questions", "Be polite, not annoying"],
		targetVocabulary: ["clarify", "requirements", "scope", "expect"],
		durationMin: 6,
	},
	{
		id: "giving-feedback",
		title: "Giving Constructive Feedback",
		category: "workplace",
		difficulty: "advanced",
		userRole: "Senior Engineer",
		aiRole: "Teammate",
		objective: "Give honest, constructive feedback to a teammate about missed deadlines without sounding harsh.",
		context: "A teammate keeps missing deadlines and it's affecting the team. As the senior on the project, you need to address it directly but kindly.",
		constraints: ["Be specific, not personal", "Offer support and a way forward"],
		targetVocabulary: ["deadline", "impact", "support", "concern"],
		durationMin: 8,
	},
	{
		id: "negotiation",
		title: "Client Negotiation",
		category: "business",
		difficulty: "advanced",
		userRole: "Account Manager",
		aiRole: "Client Decision-Maker",
		objective: "Negotiate a contract term, deadline versus price, with a client who keeps asking for more.",
		context: "The client wants the project delivered in 3 months instead of 4, but is not willing to increase the budget. You need to reach an agreement both sides can accept.",
		constraints: ["Find a middle ground", "Never give in without asking for something in return"],
		targetVocabulary: ["compromise", "budget", "timeline", "concession"],
		durationMin: 12,
	},
	{
		id: "sales-meeting",
		title: "Sales Meeting",
		category: "business",
		difficulty: "intermediate",
		userRole: "Sales Representative",
		aiRole: "Potential Customer",
		objective: "Pitch your product and handle a skeptical question about the price.",
		context: "You're pitching your SaaS product to a potential customer. They like the idea but question whether it's worth the price.",
		constraints: ["Highlight value, not just features", "Answer objections calmly"],
		targetVocabulary: ["value", "pricing", "ROI", "customers"],
		durationMin: 8,
	},
	{
		id: "client-meeting",
		title: "Client Project Meeting",
		category: "business",
		difficulty: "intermediate",
		userRole: "Project Manager",
		aiRole: "Client",
		objective: "Walk a client through a project update and address their concerns about quality.",
		context: "You're in a progress meeting with the client. They are worried about quality because of a recent delay.",
		constraints: ["Reassure with facts, not promises", "Acknowledge their concern"],
		targetVocabulary: ["progress", "quality", "assurance", "concern"],
		durationMin: 10,
	},
	{
		id: "budget-discussion",
		title: "Budget Discussion",
		category: "business",
		difficulty: "advanced",
		userRole: "Engineering Lead",
		aiRole: "Finance Director",
		objective: "Justify a budget increase for your team's tooling and defend it against tough questions.",
		context: "You're asking for a 20% budget increase to buy better tooling. The finance director is skeptical and challenges every number.",
		constraints: ["Back your request with reasoning", "Hold your ground politely"],
		targetVocabulary: ["budget", "justify", "efficiency", "investment"],
		durationMin: 10,
	},
	{
		id: "job-interview",
		title: "Job Interview",
		category: "career",
		difficulty: "intermediate",
		userRole: "Candidate",
		aiRole: "Hiring Manager",
		objective: "Answer behavioral and technical interview questions confidently and concisely.",
		context: "You're in an interview for a mid-level engineering role. The hiring manager is asking about your experience and how you handle challenges.",
		constraints: ["Use real examples, not theory", "Keep answers structured and brief"],
		targetVocabulary: ["experience", "challenge", "result", "responsibility"],
		durationMin: 8,
	},
	{
		id: "salary-negotiation",
		title: "Salary Negotiation",
		category: "career",
		difficulty: "advanced",
		userRole: "Candidate",
		aiRole: "HR / Recruiter",
		objective: "Negotiate your salary and compensation package politely without underselling yourself.",
		context: "You've received a job offer, but the salary is below what you expected. You need to negotiate respectfully.",
		constraints: ["State a clear range", "Be positive, not demanding"],
		targetVocabulary: ["compensation", "range", "offer", "benefits"],
		durationMin: 9,
	},
	{
		id: "self-introduction",
		title: "Self Introduction",
		category: "career",
		difficulty: "beginner",
		userRole: "Professional",
		aiRole: "New Colleague",
		objective: "Introduce yourself professionally and describe your experience in a few clear sentences.",
		context: "You've just joined a new company. A colleague introduces themselves and asks you to tell them about yourself.",
		constraints: ["Keep it under a minute", "End with a friendly question back"],
		targetVocabulary: ["background", "experience", "role", "looking forward"],
		durationMin: 5,
	},
	{
		id: "discussing-projects",
		title: "Describing a Past Project",
		category: "career",
		difficulty: "intermediate",
		userRole: "Candidate",
		aiRole: "Interviewer",
		objective: "Describe a past project, your role in it, and the impact it had on the business.",
		context: "An interviewer asks you to walk them through a project you're proud of. They want to understand your contribution.",
		constraints: ["Use a clear structure: situation, task, action, result", "Quantify the impact if possible"],
		targetVocabulary: ["project", "role", "impact", "solution"],
		durationMin: 8,
	},
	{
		id: "small-talk",
		title: "Small Talk at an Office Event",
		category: "professional",
		difficulty: "beginner",
		userRole: "Employee",
		aiRole: "Coworker",
		objective: "Make natural, friendly small talk with a coworker you don't know well.",
		context: "You're at the company lunch event, standing next to a coworker from another team. There's a moment of silence you want to fill.",
		constraints: ["Keep it light and positive", "Ask questions and listen"],
		targetVocabulary: ["weekend", "hobby", "team", "get along"],
		durationMin: 5,
	},
	{
		id: "disagreeing-politely",
		title: "Disagreeing Politely",
		category: "professional",
		difficulty: "advanced",
		userRole: "Senior Engineer",
		aiRole: "Product Manager",
		objective: "Disagree with a proposal you think is risky, while keeping the relationship positive.",
		context: "The product manager proposes shipping a feature without proper testing. You think it's risky and want to push back.",
		constraints: ["Acknowledge their perspective first", "Suggest an alternative"],
		targetVocabulary: ["concern", "alternative", "risk", "perspective"],
		durationMin: 8,
	},
	{
		id: "saying-no",
		title: "Saying No Professionally",
		category: "professional",
		difficulty: "intermediate",
		userRole: "Engineer",
		aiRole: "Manager",
		objective: "Politely decline extra work when you're already at capacity.",
		context: "Your manager asks you to take on another project, but your plate is already full. You need to say no without damaging the relationship.",
		constraints: ["Explain your current load", "Offer an alternative"],
		targetVocabulary: ["capacity", "commitment", "prioritize", "suggestion"],
		durationMin: 6,
	},
	{
		id: "asking-for-help",
		title: "Asking a Teammate for Help",
		category: "professional",
		difficulty: "beginner",
		userRole: "Software Engineer",
		aiRole: "Teammate",
		objective: "Ask a teammate for help with a problem you're stuck on, clearly and without wasting their time.",
		context: "You've been stuck on a bug for hours. You decide to ask a teammate for help.",
		constraints: ["Explain what you've already tried", "Be specific about what you need"],
		targetVocabulary: ["stuck", "issue", "try", "appreciate"],
		durationMin: 6,
	},
];

export function getCategories() {
	return CATEGORIES;
}

export function getScenariosByCategory(category: CategoryId | "all") {
	if (category === "all") return SCENARIOS;
	return SCENARIOS.filter((s) => s.category === category);
}

export function getScenario(id: string) {
	return SCENARIOS.find((s) => s.id === id);
}
