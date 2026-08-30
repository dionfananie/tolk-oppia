// speech/useSTT.ts — Facade hook: memanggil kedua provider (rules of hooks) lalu
// mengembalikan controller provider yang aktif (dari settings). Auto-fallback:
// kalau Deepgram dipilih tapi error saat start (mis. key belum ada / network),
// otomatis alihkan ke Web Speech untuk sesi ini, dan ekspos provider yang terpakai.

import { useCallback, useMemo, useState } from "react";
import type { SpeechProvider, STTController } from "./types";
import { useWebSpeechSTT } from "./providers/webspeech-stt";
import { useDeepgramSTT } from "./providers/deepgram-stt";
import { loadSettings } from "~/lib/storage";

export interface STTFacade {
	controller: STTController;
	/** Provider yang sedang dipakai (bisa berubah via fallback). */
	provider: SpeechProvider;
}

export function useSTT(): STTFacade {
	const [fallback, setFallback] = useState<SpeechProvider | null>(null);
	const webspeech = useWebSpeechSTT();
	const deepgram = useDeepgramSTT();

	const start = useCallback(async (opts?: { onFinal?: (text: string) => void }) => {
		const settings = loadSettings();
		const selected: SpeechProvider = settings.sttProvider;
		const useDg = selected === "deepgram";

		try {
			if (useDg) {
				setFallback(null);
				await deepgram.start(opts);
			} else {
				await webspeech.start(opts);
			}
		} catch {
			// fallback ke Web Speech
			setFallback("webspeech");
			deepgram.stop();
			await webspeech.start(opts);
		}
	}, [deepgram, webspeech]);

	const selectedProvider: SpeechProvider = loadSettings().sttProvider;
	const provider: SpeechProvider = fallback ?? selectedProvider;

	const controller = useMemo<STTController>(() => {
		// Prioritas: yang aktif → kalau fallback, pakai webspeech.
		const active =
			provider === "deepgram"
				? {
						...deepgram,
						start,
						stop: () => {
							deepgram.stop();
						},
					}
				: {
						...webspeech,
						start,
						stop: () => {
							webspeech.stop();
						},
					};
		return active;
	}, [deepgram, webspeech, provider, start]);

	return { controller, provider };
}
