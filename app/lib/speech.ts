export type SpeechEvents = {
	onFinal: (text: string) => void;
	onInterim: (text: string) => void;
	onEnd: () => void;
	onError: (error: string) => void;
};

export type Recognizer = {
	start: () => void;
	stop: () => void;
	abort: () => void;
};

type AnyRecognition = {
	lang: string;
	interimResults: boolean;
	continuous: boolean;
	onresult: ((event: unknown) => void) | null;
	onend: (() => void) | null;
	onerror: ((event: { error?: string }) => void) | null;
	start: () => void;
	stop: () => void;
	abort: () => void;
};

type RecognitionCtor = new () => AnyRecognition;

function recognitionCtor(): RecognitionCtor | null {
	if (typeof window === "undefined") return null;
	const w = window as unknown as Record<string, unknown>;
	// console.log(w.SpeechRecognition);

	return (w.SpeechRecognition as RecognitionCtor) ?? (w.webkitSpeechRecognition as RecognitionCtor) ?? null;
}

export function isSpeechSupported(): boolean {
	return recognitionCtor() !== null;
}

export function isTtsSupported(): boolean {
	return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function createRecognizer(events: SpeechEvents): Recognizer | null {
	const Ctor = recognitionCtor();
	if (!Ctor) return null;

	const rec = new Ctor();
	rec.lang = "en-US";
	rec.interimResults = true;
	rec.continuous = false;

	rec.onresult = (raw) => {
		const event = raw as {
			resultIndex: number;
			results: { length: number;[i: number]: { isFinal: boolean; 0: { transcript: string } } };
		};
		let interim = "";
		let final = "";
		for (let i = event.resultIndex; i < event.results.length; i += 1) {
			const transcript = event.results[i][0].transcript;
			if (event.results[i].isFinal) final += transcript;
			else interim += transcript;
		}
		if (interim) events.onInterim(interim);
		if (final) events.onFinal(final.trim());
	};

	rec.onend = () => events.onEnd();
	rec.onerror = (event) => events.onError(event?.error ?? "unknown");

	return {
		start: () => {
			try {
				rec.start();
			} catch {
				// already running
			}
		},
		stop: () => {
			try {
				rec.stop();
			} catch {
				// not running
			}
		},
		abort: () => {
			try {
				rec.abort();
			} catch {
				// not running
			}
		},
	};
}

export type Voice = {
	uri: string;
	name: string;
	lang: string;
};

export function getVoices(): Voice[] {
	if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
	return window.speechSynthesis.getVoices().map((voice) => ({
		uri: voice.voiceURI,
		name: voice.name,
		lang: voice.lang,
	}));
}

export type SpeakOptions = {
	rate?: number;
	voiceUri?: string;
	onStart?: () => void;
	onEnd?: () => void;
};

export function speak(text: string, options: SpeakOptions = {}): void {
	if (!isTtsSupported()) return;
	window.speechSynthesis.cancel();
	const utterance = new SpeechSynthesisUtterance(text);
	utterance.lang = "en-US";
	utterance.rate = options.rate ?? 1;
	if (options.voiceUri) {
		const voice = window.speechSynthesis
			.getVoices()
			.find((candidate) => candidate.voiceURI === options.voiceUri);
		if (voice) utterance.voice = voice;
	}
	utterance.onstart = () => options.onStart?.();
	utterance.onend = () => options.onEnd?.();
	utterance.onerror = () => options.onEnd?.();
	window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
	if (isTtsSupported()) window.speechSynthesis.cancel();
}

export function rateFromSetting(rate: string): number {
	if (rate === "slow") return 0.85;
	if (rate === "fast") return 1.15;
	return 1;
}
