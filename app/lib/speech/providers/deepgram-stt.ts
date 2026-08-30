// speech/providers/deepgram-stt.ts — STT via Deepgram (audio-proxy, BYOK server-side).
// Audio dari MediaRecorder di-stream lewat fetch POST /api/dg/transcribe; Worker
// meneruskan ke Deepgram WS dan mengembalikan transcript live sebagai SSE. Key user
// TIDAK pernah menyentuh browser, semua diproses server.
//
// Butuh login + key Deepgram tersimpan (lihat /api/dg/status).

import { useCallback, useEffect, useRef, useState } from "react";
import type { STTController } from "../types";

type DgEvent =
	| { type: "interim"; text: string }
	| { type: "final"; text: string }
	| { type: "utteranceEnd"; text: string }
	| { type: "error"; text: string; error: string };

/** Cek apakah user punya key Deepgram tersimpan (untuk gating di UI/facade). */
export async function fetchHasDeepgramKey(): Promise<boolean> {
	try {
		const res = await fetch("/api/dg/status", { credentials: "same-origin" });
		if (!res.ok) return false;
		const data = (await res.json()) as { hasKey?: boolean };
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

	const controllerRef = useRef<ReadableStreamDefaultController<Uint8Array> | null>(null);
	const recorderRef = useRef<MediaRecorder | null>(null);
	const mediaRef = useRef<MediaStream | null>(null);
	const fetchRef = useRef<AbortController | null>(null);
	const onFinalRef = useRef<((text: string) => void) | null>(null);

	const reset = useCallback(() => {
		setTranscript("");
		setInterim("");
	}, []);

	const start = useCallback(async (opts?: { onFinal?: (text: string) => void }) => {
		onFinalRef.current = opts?.onFinal ?? null;
		setError(null);
		reset();
		setIsListening(true);

		const fetchAbort = new AbortController();
		fetchRef.current = fetchAbort;

		// Streaming audio ke request body: MediaRecorder mendorong chunk ke controller.
		const bodyStream = new ReadableStream<Uint8Array>({
			start(controller) {
				controllerRef.current = controller;
			},
			cancel() {
				controllerRef.current = null;
			},
		});

		try {
			const media = await navigator.mediaDevices.getUserMedia({
				audio: { echoCancellation: true, noiseSuppression: true },
			});
			mediaRef.current = media;

			const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
				? "audio/webm;codecs=opus"
				: MediaRecorder.isTypeSupported("audio/webm")
					? "audio/webm"
					: "";
			const recorder = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
			recorderRef.current = recorder;

			recorder.ondataavailable = (event) => {
				if (event.data && event.data.size > 0) {
					void event.data.arrayBuffer().then((buf) => {
						if (controllerRef.current) {
							try {
								controllerRef.current.enqueue(new Uint8Array(buf));
							} catch {
								// stream sudah ditutup
							}
						}
					});
				}
			};
			recorder.onerror = () => {
				setError("MediaRecorder gagal merekam audio.");
				setIsListening(false);
			};
			recorder.start(250);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Gagal mengakses mikrofon.");
			setIsListening(false);
			try {
				await bodyStream.cancel();
			} catch {
				// ignore
			}
			return;
		}

		// Kirim stream audio; Worker mengembalikan SSE transcript.
		void (async () => {
			try {
				const res = await fetch("/api/dg/transcribe", {
					method: "POST",
					credentials: "same-origin",
					headers: { "content-type": "audio/webm" },
					body: bodyStream,
					signal: fetchAbort.signal,
				});
				if (!res.ok) {
					let msg = `Deepgram STT gagal (HTTP ${res.status}).`;
					try {
						const data = (await res.json()) as { error?: string };
						if (data.error) msg = data.error;
					} catch {
						// body bukan json
					}
					setError(msg);
					setIsListening(false);
					return;
				}
				if (!res.body) return;
				await parseSse(res.body, (evt) => {
					if (evt.type === "interim") {
						setInterim(evt.text);
					} else if (evt.type === "final" || evt.type === "utteranceEnd") {
						if (evt.text) {
							setTranscript((prev) => (prev ? prev + " " + evt.text : evt.text));
							setInterim("");
							onFinalRef.current?.(evt.text);
						}
					} else if (evt.type === "error") {
						if (evt.error) setError(evt.error);
						setIsListening(false);
					}
				});
			} catch {
				// abort/dibersihkan
				setIsListening(false);
			} finally {
				setIsListening(false);
			}
		})();
	}, [reset]);

	const stop = useCallback(() => {
		try {
			recorderRef.current?.stop();
			controllerRef.current?.close();
			fetchRef.current?.abort();
		} catch {
			// ignore
		}
		recorderRef.current = null;
		setIsListening(false);
		setInterim("");
	}, []);

	useEffect(() => {
		return () => {
			try {
				recorderRef.current?.stop();
				controllerRef.current?.close();
				fetchRef.current?.abort();
				mediaRef.current?.getTracks().forEach((track) => track.stop());
			} catch {
				// ignore
			}
		};
	}, []);

	return { transcript, interimTranscript, isListening, isSupported: true, start, stop, error };
}

/** Parse body SSE dan memanggil callback utk tiap event transcript. */
async function parseSse(
	stream: ReadableStream<Uint8Array>,
	onEvent: (evt: DgEvent) => void,
): Promise<void> {
	const decoder = new TextDecoder();
	let buffer = "";
	const reader = stream.getReader();
	for (;;) {
		const { value, done } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		let idx: number;
		while ((idx = buffer.indexOf("\n\n")) !== -1) {
			const block = buffer.slice(0, idx);
			buffer = buffer.slice(idx + 2);
			const line = block
				.split("\n")
				.find((l) => l.startsWith("data:"))
				?.slice(5)
				.trim();
			if (!line) continue;
			try {
				onEvent(JSON.parse(line) as DgEvent);
			} catch {
				// skip line tidak valid
			}
		}
	}
}
