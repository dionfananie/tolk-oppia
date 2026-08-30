// speech/useTTS.ts — Facade hook TTS: memanggil kedua provider, mengembalikan yang
// aktif (dari settings). Auto-fallback: kalau Deepgram gagal speak (key tak ada / error),
// bicarakan lewat Web Speech utk ucapan itu.

import { useCallback, useState } from "react";
import type { TTSController } from "./types";
import { useWebSpeechTTS } from "./providers/webspeech-tts";
import { useDeepgramTTS } from "./providers/deepgram-tts";
import { loadSettings } from "~/lib/storage";

export interface TTSFacade {
	controller: TTSController;
	provider: "webspeech" | "deepgram";
}

export function useTTS(): TTSFacade {
	const [fallback, setFallback] = useState<"webspeech" | "deepgram" | null>(null);
	const webspeech = useWebSpeechTTS();
	const deepgram = useDeepgramTTS();

	const selectedProvider: "webspeech" | "deepgram" = loadSettings().ttsProvider;
	const provider: "webspeech" | "deepgram" = fallback ?? selectedProvider;

	const speak = useCallback(
		async (text: string, opts?: { voice?: string; rate?: number; onEnd?: () => void }) => {
			const settings = loadSettings();
			const target = settings.ttsProvider;

			if (target === "webspeech") {
				setFallback("webspeech");
				await webspeech.speak(text, {
					voice: opts?.voice ?? settings.voiceUri,
					rate: opts?.rate,
					onEnd: opts?.onEnd,
				});
				return;
			}

			// Deepgram dipilih.
			try {
				setFallback("deepgram");
				await deepgram.speak(text, { voice: opts?.voice ?? settings.deepgramVoice, onEnd: opts?.onEnd });
			} catch {
				setFallback("webspeech");
				webspeech.cancel();
				await webspeech.speak(text, { voice: settings.voiceUri, rate: opts?.rate, onEnd: opts?.onEnd });
			}
		},
		[webspeech, deepgram],
	);

	const cancel = useCallback(() => {
		deepgram.cancel();
		webspeech.cancel();
	}, [deepgram, webspeech]);

	const controller: TTSController = {
		isSpeaking: provider === "webspeech" ? webspeech.isSpeaking : deepgram.isSpeaking,
		isSupported: provider === "webspeech" ? webspeech.isSupported : deepgram.isSupported,
		speak,
		cancel,
		error: provider === "webspeech" ? webspeech.error : deepgram.error,
	};

	return { controller, provider };
}
