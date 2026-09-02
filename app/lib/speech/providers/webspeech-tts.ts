// speech/providers/webspeech-tts.ts — TTS via browser `speechSynthesis`.
// Membungkus `speak`/`stopSpeaking` dari lib/speech agar sesuai kontrak TTSController.

import { useCallback, useRef, useState } from "react";
import type { TTSController } from "../types";
import { isTtsSupported, speak, stopSpeaking } from "~/lib/speech-core";

export function useWebSpeechTTS(): TTSController {
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const speakText = useCallback(
		async (text: string, opts?: { voice?: string; rate?: number; onEnd?: () => void }) => {
			if (!isTtsSupported()) {
				setError("This browser does not support speech synthesis.");
				return;
			}
			setError(null);
			speak(text, {
				voiceUri: opts?.voice,
				rate: opts?.rate,
				onStart: () => setIsSpeaking(true),
				onEnd: () => {
					setIsSpeaking(false);
					opts?.onEnd?.();
				},
			});
		},
		[],
	);

	const cancel = useCallback(() => {
		setIsSpeaking(false);
		stopSpeaking();
	}, []);

	return {
		isSpeaking,
		isSupported: isTtsSupported(),
		speak: speakText,
		cancel,
		error,
	};
}
