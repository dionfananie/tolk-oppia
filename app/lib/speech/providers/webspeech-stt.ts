// speech/providers/webspeech-stt.ts — STT via Web Speech API (browser built-in).
// Membungkus `createRecognizer` dari lib/speech agar sesuai kontrak STTController.

import { useCallback, useEffect, useRef, useState } from "react";
import type { STTController } from "../types";
import { createRecognizer, isSpeechSupported } from "~/lib/speech-core";

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
			const message = "This browser does not support speech recognition.";
			setError(message);
			throw new Error(message);
		}
		recRef.current?.abort();
		recRef.current = rec;
		reset();
		if (!rec.start()) {
			recRef.current = null;
			setError("Could not start speech recognition. Please try again.");
			throw new Error("Could not start speech recognition.");
		}
		setIsListening(true);
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
		isSupported: isSpeechSupported(),
		start,
		stop,
		error,
	};
}
