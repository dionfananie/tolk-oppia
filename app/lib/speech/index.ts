// speech/index.ts — Barrel export modul speech.
export type { STTController, TTSController, SpeechProvider } from "./types";
export { useSTT } from "./useSTT";
export type { STTFacade } from "./useSTT";
export { useTTS } from "./useTTS";
export type { TTSFacade } from "./useTTS";
export { useWebSpeechSTT } from "./providers/webspeech-stt";
export { useWebSpeechTTS } from "./providers/webspeech-tts";
export { useDeepgramSTT, fetchHasDeepgramKey } from "./providers/deepgram-stt";
export { useDeepgramTTS, DEEPGRAM_VOICES } from "./providers/deepgram-tts";
export { useSpeechSettings } from "./useSettings";
export type { SpeechSettings } from "./useSettings";
export {
	getVoices,
	isSpeechSupported,
	isTtsSupported,
	rateFromSetting,
	speak,
	stopSpeaking,
} from "~/lib/speech-core";
export type { Voice, SpeakOptions, SpeechEvents, Recognizer } from "~/lib/speech-core";
