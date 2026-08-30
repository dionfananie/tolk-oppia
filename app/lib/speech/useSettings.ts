// speech/useSettings.ts — Hook baca/tulis preferensi provider STT/TTS + voice Deepgram.
// Berbasis `loadSettings`/`saveSettings` dari storage (localStorage). Dipakai komponen
// yang butuh baca provider aktif (facade, badge UI) tanpa mengelola seluruh objek
// settings (yang dipegang halaman Settings).

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { SpeechProvider } from "./types";
import { loadSettings, saveSettings, type Settings } from "~/lib/storage";

let cached: Settings = loadSettings();
const listeners = new Set<() => void>();

function emit() {
	cached = loadSettings();
	listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
	listeners.add(cb);
	return () => listeners.delete(cb);
}

function getSnapshot(): Settings {
	return cached;
}

export interface SpeechSettings {
	sttProvider: SpeechProvider;
	ttsProvider: SpeechProvider;
	deepgramVoice: string;
	setSttProvider: (p: SpeechProvider) => void;
	setTtsProvider: (p: SpeechProvider) => void;
	setDeepgramVoice: (v: string) => void;
}

export function useSpeechSettings(): SpeechSettings {
	const settings = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

	const setSttProvider = useCallback((p: SpeechProvider) => {
		saveSettings({ ...loadSettings(), sttProvider: p });
		emit();
	}, []);

	const setTtsProvider = useCallback((p: SpeechProvider) => {
		saveSettings({ ...loadSettings(), ttsProvider: p });
		emit();
	}, []);

	const setDeepgramVoice = useCallback((v: string) => {
		saveSettings({ ...loadSettings(), deepgramVoice: v });
		emit();
	}, []);

	return useMemo(
		() => ({
			sttProvider: settings.sttProvider,
			ttsProvider: settings.ttsProvider,
			deepgramVoice: settings.deepgramVoice,
			setSttProvider,
			setTtsProvider,
			setDeepgramVoice,
		}),
		[settings, setSttProvider, setTtsProvider, setDeepgramVoice],
	);
}
