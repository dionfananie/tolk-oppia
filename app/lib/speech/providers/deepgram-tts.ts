// speech/providers/deepgram-tts.ts — TTS via Deepgram Aura (server-proxy, BYOK).
// POST /api/dg/tts diisi text+voice, server mencocokkan key user, mengembalikan audio
// mp3 yang diputar via Audio element (atau AudioContext). Key TIDAK pernah ke browser.

import { useCallback, useRef, useState } from "react";
import type { TTSController } from "../types";

// Voice Aura yang tersedia untuk dipilih user di Settings.
export const DEEPGRAM_VOICES: { id: string; label: string }[] = [
	{ id: "aura-asteria-en", label: "Asteria (American English)" },
	{ id: "aura-luna-en", label: "Luna (British English)" },
	{ id: "aura-stella-en", label: "Stella (British English)" },
	{ id: "aura-orion-en", label: "Orion (British English)" },
	{ id: "aura-athena-en", label: "Athena (American English)" },
];

export function useDeepgramTTS(): TTSController {
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const speakText = useCallback(
		async (text: string, opts?: { voice?: string; onEnd?: () => void }) => {
			const voice = opts?.voice ?? "aura-asteria-en";
			setError(null);
			try {
				const res = await fetch("/api/dg/tts", {
					method: "POST",
					credentials: "same-origin",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ text, voice }),
				});
				if (!res.ok) {
					let msg = `Deepgram TTS gagal (HTTP ${res.status}).`;
					try {
						const data = (await res.json()) as { error?: string };
						if (data.error) msg = data.error;
					} catch {
						// body bukan json
					}
					setError(msg);
					return;
				}
				const blob = await res.blob();
				const url = URL.createObjectURL(blob);
				const audio = audioRef.current ?? new Audio();
				audioRef.current = audio;
				audio.src = url;
				audio.onplay = () => setIsSpeaking(true);
				audio.onended = () => {
					setIsSpeaking(false);
					URL.revokeObjectURL(url);
					opts?.onEnd?.();
				};
				audio.onerror = () => {
					setError("Gagal memutar audio Deepgram.");
					setIsSpeaking(false);
					URL.revokeObjectURL(url);
					opts?.onEnd?.();
				};
				await audio.play();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Gagal memanggil Deepgram TTS.");
			}
		},
		[],
	);

	const cancel = useCallback(() => {
		try {
			audioRef.current?.pause();
			audioRef.current = null;
		} catch {
			// ignore
		}
		setIsSpeaking(false);
	}, []);

	return {
		isSpeaking,
		isSupported: true,
		speak: speakText,
		cancel,
		error,
	};
}
