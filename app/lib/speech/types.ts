// speech/types.ts — Kontrak interface umum STT/TTS agar provider (WebSpeech/Deepgram)
// bisa ditukar tanpa mengubah komponen UI. Provider aktif dibaca dari settings.

export type SpeechProvider = "webspeech" | "deepgram";

export interface STTController {
	transcript: string;
	interimTranscript: string;
	isListening: boolean;
	/** false bila browser tak mendukung provider (khusus WebSpeech). */
	isSupported: boolean;
	/** Mulai mendengarkan. `onFinal` dipanggil saat satu ucapan/utterance selesai (opsional). */
	start: (opts?: { onFinal?: (text: string) => void }) => Promise<void>;
	stop: () => void;
	error: string | null;
}

export interface TTSController {
	isSpeaking: boolean;
	isSupported: boolean;
	/** Bicarakan text. `onEnd` dipanggil saat ucapan selesai/berhenti (opsional). */
	speak: (text: string, opts?: { voice?: string; rate?: number; onEnd?: () => void }) => Promise<void>;
	cancel: () => void;
	error: string | null;
}
