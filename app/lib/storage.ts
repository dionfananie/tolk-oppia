import type { EnglishLevel } from "~/data/scenarios";
import type { ChatMessage } from "~/lib/providers";
import type { Feedback } from "~/lib/feedback";

export type ProviderName = "openai" | "deepseek" | "anthropic" | "gemini" | "openrouter" | "groq" | "together";

export type Setup = {
	level: EnglishLevel;
	provider: ProviderName;
	model: string;
	/** true = user login & key provider tersimpan terenkripsi di server (pakai relay /api/chat).
	 *  Key TIDAK pernah disimpan atau beredar di frontend. */
	serverKey?: boolean;
	mode?: "voice" | "text";
};

/** True jika setup sudah bisa dipakai: user login & key tersimpan server (serverKey). */
export function setupReady(setup: Setup | null | undefined): boolean {
	return Boolean(setup && setup.serverKey);
}

const SESSIONS_KEY = "tolk-oppia.sessions.v1";
const PREFS_KEY = "tolk-oppia.prefs.v1";
const SETTINGS_KEY = "tolk-oppia.settings.v1";
const DRAFT_KEY = "tolk-oppia.draft.v1";

export type Session = {
	id: string;
	scenarioId: string;
	level: EnglishLevel;
	provider: ProviderName;
	model: string;
	startedAt: string;
	endedAt: string;
	messages: ChatMessage[];
	score: number;
	feedback: Feedback | null;
};

type Prefs = {
	level: EnglishLevel;
	provider: ProviderName;
	model: string;
	mode: "voice" | "text";
};

export type Settings = {
	captions: boolean;
	autoPlay: boolean;
	promptStyle: "direct" | "encouraging";
	speechRate: "slow" | "normal" | "fast";
	voiceUri: string;
	sttProvider: SpeechProviderChoice;
	ttsProvider: SpeechProviderChoice;
	/** Voice Aura (Deepgram TTS). */
	deepgramVoice: string;
};

const DEFAULT_SETTINGS: Settings = {
	captions: false,
	autoPlay: true,
	promptStyle: "encouraging",
	speechRate: "normal",
	voiceUri: "",
	sttProvider: "webspeech",
	ttsProvider: "webspeech",
	deepgramVoice: "aura-asteria-en",
};

let memorySetup: Setup | null = null;

export function getSetup(): Setup | null {
	return memorySetup;
}

export function setSetup(setup: Setup | null): void {
	memorySetup = setup;
	if (setup) {
		savePrefs({
			level: setup.level,
			provider: setup.provider,
			model: setup.model,
			mode: setup.mode ?? "text",
		});
	}
}

/** Provider yang dipakai utk STT/TTS. default 'webspeech' (tak butuh setup). */
export type SpeechProviderChoice = "webspeech" | "deepgram";

function savePrefs(prefs: Prefs): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
	} catch {
		// storage unavailable
	}
}

export function loadPrefs(): Prefs | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(PREFS_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<Prefs>;
		if (
			typeof parsed.level === "string" &&
			typeof parsed.provider === "string" &&
			typeof parsed.model === "string"
		) {
			return {
				level: parsed.level as Prefs["level"],
				provider: parsed.provider as Prefs["provider"],
				model: parsed.model,
				mode: parsed.mode === "voice" ? "voice" : "text",
			};
		}
		return null;
	} catch {
		return null;
	}
}

export function setupFromPrefs(): Setup | null {
	const prefs = loadPrefs();
	if (!prefs) return null;
	// Provider/model dari prefs. Key TIDAK ada di frontend — chat() selalu relay /api/chat,
	// server memakai key tersimpan. `serverKey` diisi terpisah saat diketahui user login.
	return {
		level: prefs.level,
		provider: prefs.provider,
		model: prefs.model,
		mode: prefs.mode,
	};
}

export function loadSettings(): Settings {
	if (typeof window === "undefined") return DEFAULT_SETTINGS;
	try {
		const raw = window.localStorage.getItem(SETTINGS_KEY);
		if (!raw) return DEFAULT_SETTINGS;
		const parsed = JSON.parse(raw) as Partial<Settings>;
		return {
			captions: typeof parsed.captions === "boolean" ? parsed.captions : DEFAULT_SETTINGS.captions,
			autoPlay: typeof parsed.autoPlay === "boolean" ? parsed.autoPlay : DEFAULT_SETTINGS.autoPlay,
			promptStyle: parsed.promptStyle === "direct" ? "direct" : "encouraging",
			speechRate: parsed.speechRate ?? DEFAULT_SETTINGS.speechRate,
			voiceUri: typeof parsed.voiceUri === "string" ? parsed.voiceUri : DEFAULT_SETTINGS.voiceUri,
			sttProvider: parsed.sttProvider === "deepgram" ? "deepgram" : "webspeech",
			ttsProvider: parsed.ttsProvider === "deepgram" ? "deepgram" : "webspeech",
			deepgramVoice:
				typeof parsed.deepgramVoice === "string" ? parsed.deepgramVoice : DEFAULT_SETTINGS.deepgramVoice,
		};
	} catch {
		return DEFAULT_SETTINGS;
	}
}

export function saveSettings(settings: Settings): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
	} catch {
		// storage unavailable
	}
}

function readSessions(): Session[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(SESSIONS_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as Session[]) : [];
	} catch {
		return [];
	}
}

function writeSessions(sessions: Session[]): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
	} catch {
		// storage unavailable
	}
}

export function saveSession(session: Session): void {
	const sessions = readSessions();
	const index = sessions.findIndex((s) => s.id === session.id);
	if (index === -1) {
		sessions.unshift(session);
	} else {
		sessions[index] = session;
	}
	writeSessions(sessions);
}

export function getSessions(): Session[] {
	return readSessions();
}

export function getSession(id: string): Session | undefined {
	return readSessions().find((s) => s.id === id);
}

export function deleteSession(id: string): void {
	writeSessions(readSessions().filter((s) => s.id !== id));
}

export type SessionDraft = {
	scenarioId: string;
	userRole: string;
	aiRole: string;
	objective: string;
	durationMin: number;
	mode: "voice" | "text";
};

export function saveDraft(draft: SessionDraft): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
	} catch {
		// storage unavailable
	}
}

export function loadDraft(): SessionDraft | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(DRAFT_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<SessionDraft>;
		if (typeof parsed.scenarioId !== "string") return null;
		return {
			scenarioId: parsed.scenarioId,
			userRole: typeof parsed.userRole === "string" ? parsed.userRole : "",
			aiRole: typeof parsed.aiRole === "string" ? parsed.aiRole : "",
			objective: typeof parsed.objective === "string" ? parsed.objective : "",
			durationMin: typeof parsed.durationMin === "number" ? parsed.durationMin : 10,
			mode: parsed.mode === "voice" ? "voice" : "text",
		};
	} catch {
		return null;
	}
}

export function clearDraft(): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.removeItem(DRAFT_KEY);
	} catch {
		// storage unavailable
	}
}
