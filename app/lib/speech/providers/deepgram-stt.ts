import { useCallback, useEffect, useRef, useState } from "react";
import type { STTController } from "../types";

export async function fetchHasDeepgramKey(): Promise<boolean> {
	try {
		const response = await fetch("/api/dg/status", { credentials: "same-origin" });
		if (!response.ok) return false;
		const data = (await response.json()) as { hasKey?: boolean };
		return Boolean(data.hasKey);
	} catch {
		return false;
	}
}

export function useDeepgramSTT(): STTController {
	const [transcript, setTranscript] = useState("");
	const [interimTranscript, setInterim] = useState("");
	const [isListening, setIsListening] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const recorderRef = useRef<MediaRecorder | null>(null);
	const mediaRef = useRef<MediaStream | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const requestRef = useRef<AbortController | null>(null);
	const onFinalRef = useRef<((text: string) => void) | null>(null);
	const startAttemptRef = useRef(0);

	const stopTracks = useCallback(() => {
		mediaRef.current?.getTracks().forEach((track) => track.stop());
		mediaRef.current = null;
	}, []);

	const transcribe = useCallback(async (audio: Blob) => {
		if (audio.size === 0) {
			setError("No microphone audio was recorded. Please try again.");
			return;
		}

		const request = new AbortController();
		requestRef.current = request;
		try {
			const response = await fetch("/api/dg/transcribe", {
				method: "POST",
				credentials: "same-origin",
				headers: { "content-type": audio.type || "audio/webm" },
				body: audio,
				signal: request.signal,
			});
			const data = (await response.json().catch(() => ({}))) as {
				transcript?: string;
				error?: string;
				message?: string;
			};
			if (!response.ok) {
				throw new Error(data.message ?? data.error ?? `Speech recognition failed (HTTP ${response.status}).`);
			}

			const text = data.transcript?.trim() ?? "";
			if (!text) {
				setError("No speech detected. Please try again.");
				return;
			}
			setTranscript(text);
			setInterim("");
			onFinalRef.current?.(text);
		} catch (cause) {
			if (!request.signal.aborted) {
				setError(cause instanceof Error ? cause.message : "Speech recognition failed.");
			}
		} finally {
			if (requestRef.current === request) requestRef.current = null;
		}
	}, []);

	const start = useCallback(async (opts?: { onFinal?: (text: string) => void }) => {
		const attempt = ++startAttemptRef.current;
		if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
			const message = "This browser cannot record microphone audio.";
			setError(message);
			throw new Error(message);
		}
		const hasKey = await fetchHasDeepgramKey();
		if (attempt !== startAttemptRef.current) return;
		if (!hasKey) {
			const message = "Deepgram is not connected. Using browser speech instead.";
			setError(message);
			throw new Error(message);
		}

		requestRef.current?.abort();
		onFinalRef.current = opts?.onFinal ?? null;
		chunksRef.current = [];
		setTranscript("");
		setInterim("");
		setError(null);

		try {
			const media = await navigator.mediaDevices.getUserMedia({
				audio: { echoCancellation: true, noiseSuppression: true },
			});
			if (attempt !== startAttemptRef.current) {
				media.getTracks().forEach((track) => track.stop());
				return;
			}
			mediaRef.current = media;
			const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
				? "audio/webm;codecs=opus"
				: MediaRecorder.isTypeSupported("audio/webm")
					? "audio/webm"
					: "";
			const recorder = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
			recorderRef.current = recorder;
			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) chunksRef.current.push(event.data);
			};
			recorder.onstop = () => {
				const audio = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
				chunksRef.current = [];
				stopTracks();
				void transcribe(audio);
			};
			recorder.onerror = () => {
				setError("Audio recording failed. Please try again.");
				setIsListening(false);
				stopTracks();
			};
			recorder.start();
			setIsListening(true);
		} catch (cause) {
			stopTracks();
			const message = cause instanceof Error ? cause.message : "Could not access the microphone.";
			setError(message);
			setIsListening(false);
			throw cause;
		}
	}, [stopTracks, transcribe]);

	const stop = useCallback(() => {
		startAttemptRef.current += 1;
		const recorder = recorderRef.current;
		recorderRef.current = null;
		if (recorder?.state === "recording") {
			recorder.stop();
		} else {
			stopTracks();
		}
		setIsListening(false);
		setInterim("");
	}, [stopTracks]);

	useEffect(() => {
		return () => {
			startAttemptRef.current += 1;
			requestRef.current?.abort();
			const recorder = recorderRef.current;
			if (recorder) {
				recorder.ondataavailable = null;
				recorder.onstop = null;
				recorder.onerror = null;
				if (recorder.state === "recording") recorder.stop();
			}
			recorderRef.current = null;
			chunksRef.current = [];
			stopTracks();
		};
	}, [stopTracks]);

	const isSupported =
		typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";

	return { transcript, interimTranscript, isListening, isSupported, start, stop, error };
}
