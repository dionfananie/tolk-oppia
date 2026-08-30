// speech/providers/webspeech-stt.ts — STT via Web Speech API (browser built-in).
// Membungkus `createRecognizer` dari lib/speech agar sesuai kontrak STTController.

import { useCallback, useEffect, useRef, useState } from "react";
import type { STTController } from "../types";
import { createRecognizer } from "~/lib/speech-core";

export function useWebSpeechSTT(): STTController {
	const [transcript, setTranscript] = useState("");
	const [interimTranscript, setInterim] = useState("");
	const [isListening, setIsListening] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const recRef = useRef<ReturnType<typeof createRecognizer> | null>(null);

	const reset = useCallback(() => {
		setTranscript("");
		setInterim("");
	}, []);

	const start = useCallback(async (opts?: { onFinal?: (text: string) => void }) => {
		setError(null);
		const rec = createRecognizer({
			onInterim: (text) => setInterim(text),
			onFinal: (text) => {
				if (!text) return;
				opts?.onFinal?.(text);
				setTranscript((prev) => (prev ? prev + " " + text : text));
				setInterim("");
			},
			onEnd: () => {
				setIsListening(false);
			},
			onError: (err) => {
				setIsListening(false);
				setError(err === "no-speech" ? "No speech detected." : `Speech error: ${err}`);
			},
		});
		if (!rec) {
			setError("Browser tidak mendukung Web Speech API.");
			return;
		}
		recRef.current?.stop();
		recRef.current = rec;
		rec.start();
		setIsListening(true);
		reset();
	}, [reset]);

	const stop = useCallback(() => {
		recRef.current?.stop();
		setIsListening(false);
	}, []);

	useEffect(() => {
		return () => {
			recRef.current?.abort();
		};
	}, []);

	return {
		transcript,
		interimTranscript,
		isListening,
		isSupported: true,
		start,
		stop,
		error,
	};
}
