// ai/deepgram.ts — Provider Deepgram untuk STT/TTS (bukan chat).
// Dipakai secara terpisah dari router AI chat: Deepgram tidak OpenAI-compatible.
// Semua request memakai key milik user (BYOK) yang di-decrypt server-side;
// key TIDAK pernah dikirim ke browser.
//
// Design STT: audio-proxy lewat HTTP streaming (bukan WebSocket duplex dua arah).
// Client streaming audio (MediaRecorder webm/opus) via POST /api/dg/transcribe,
// Worker membuka WS outbound ke api.deepgram.com, meneruskan bytes audio, lalu
// mengembalikan transcript live sebagai SSE. Ini menghindari Durable Objects dan
// mempertahankan prinsip BYOK (key hanya hidup di server).

const API = "https://api.deepgram.com/v1";

/** Id provider Deepgram di tabel `user_ai_credentials` (BYOK). */
export const DEEPGRAM_PROVIDER = "deepgram";

type DeepgramProjectResp = { projects?: Array<{ project_id: string }> };

/** Validasi API key Deepgram: apakah key bisa mengakses daftar project (2xx = valid). */
export async function testDeepgramKey(apiKey: string): Promise<boolean> {
	const res = await fetch(`${API}/projects`, {
		headers: { authorization: `Token ${apiKey.trim()}` },
	});
	if (!res.ok) return false;
	const data = (await res.json().catch(() => ({}))) as DeepgramProjectResp;
	return Array.isArray(data.projects);
}

/**
 * TTS — panggil Deepgram Aura, kembalikan Response audio (mp3) atau Response JSON error.
 * `voice` salah satu Aura voice, mis. aura-asteria-en, aura-luna-en.
 */
export async function deepgramSpeak(
	apiKey: string,
	text: string,
	voice = "aura-asteria-en",
): Promise<Response> {
	const res = await fetch(
		`${API}/speak?model=${encodeURIComponent(voice)}`,
		{
			method: "POST",
			headers: {
				authorization: `Token ${apiKey.trim()}`,
				"content-type": "application/json",
			},
			body: JSON.stringify({ text }),
		},
	);
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		return new Response(
			JSON.stringify({ error: `Deepgram TTS failed (HTTP ${res.status})${text ? `: ${text}` : ""}` }),
			{ status: res.status, headers: { "content-type": "application/json" } },
		);
	}
	// Stream audio langsung ke client (mp3 dari Aura).
	return new Response(res.body, {
		headers: {
			"content-type": res.headers.get("content-type") ?? "audio/mpeg",
			"cache-control": "no-store",
		},
	});
}

// ── STT proxy ───────────────────────────────────────────────────────────────────
// Alur:
// 1. Auth user + decrypt key (dilakukan di route).
// 2. Buka outbound WS ke api.deepgram.com/v1/listen dengan key user.
// 3. Task (a): baca request.body stream -> ws.send(byte chunks) (audio webm/opus).
//    Task (b): ws.onmessage (transcript JSON) -> push SSE event ke response stream.
// 4. Saat body selesai -> ws.close() -> Deepgram kirim hasil akhir -> tutup SSE.

const DEEPGRAM_WS = "wss://api.deepgram.com/v1/listen";

export type TranscribeEvents =
	| { type: "interim"; text: string }
	| { type: "final"; text: string }
	| { type: "utteranceEnd"; text: string }
	| { type: "end"; text: string; error?: string };

export type TranscribeParams = {
	model?: string;
	/** MediaRecorder menyimpan audio dalam container webm + opus. */
	encoding?: string;
	sampleRate?: number;
};

/**
 * Proses audio streaming dari request body menjadi transcript; kembalikan
 * ReadableStream SSE yang menyiarkan event TranscribeEvents. Mustahil gagal
 * membuka WS Deepgram -> lemparkan Error (tertangkap di route, dikembalikan JSON).
 */
export function streamTranscribe(apiKey: string, body: ReadableStream<Uint8Array>, params: TranscribeParams = {}): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();

	const qp = new URLSearchParams({
		model: params.model ?? "nova-2",
		interim_results: "true",
		smart_format: "true",
		punctuate: "true",
		endpointing: "300",
		encoding: params.encoding ?? "opus",
	});
	if (params.sampleRate) qp.set("sample_rate", String(params.sampleRate));

	const ws = new WebSocket(`${DEEPGRAM_WS}?${qp.toString()}`, ["token", apiKey.trim()]);

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			let wsOpen = false;
			let finalized = false;

			const sendSse = (data: unknown) => {
				if (finalized) return;
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
				} catch {
					// stream sudah ditutup client/karena error
				}
			};

			const close = () => {
				if (finalized) return;
				finalized = true;
				try {
					controller.close();
				} catch {
					// sudah closed
				}
				try {
					ws.close();
				} catch {
					// ignore
				}
			};

			// Task (a): pompa audio dari request body ke Deepgram; lalu tutup WS
			// agar Deepgram memfinalisasi hasil. Dijalankan setelah ws terbuka.
			const pumpAudio = async () => {
				try {
					const reader = body.getReader();
					for (;;) {
						const { value, done } = await reader.read();
						if (done) break;
						if (ws.readyState === WebSocket.OPEN) ws.send(value);
					}
					if (ws.readyState === WebSocket.OPEN) ws.close(1000, "audio-end");
				} catch {
					close();
				}
			};

			ws.onopen = () => {
				wsOpen = true;
				void pumpAudio();
			};

			ws.onerror = () => {
				if (!wsOpen) {
					// Gagal sebelum terhubung, mis. key invalid / kuota habis.
					sendSse({ type: "error", text: "", error: "Could not connect to Deepgram speech." });
				}
				close();
			};

			ws.onmessage = (event) => {
				if (typeof event.data !== "string") return;
				let data: {
					type?: string;
					is_final?: boolean;
					speech_final?: boolean;
					channel?: { alternatives?: { transcript: string }[] };
				};
				try {
					data = JSON.parse(event.data);
				} catch {
					return;
				}
				// Skip pesan metadata (punya field `type`, mis. "Metadata"/"SpeakingStarted").
				if (data.type) return;
				const text = data.channel?.alternatives?.[0]?.transcript?.trim() ?? "";
				if (!text) return;
				if (data.is_final) {
					sendSse({ type: "final", text });
				} else if (data.speech_final) {
					sendSse({ type: "utteranceEnd", text });
				} else {
					sendSse({ type: "interim", text });
				}
			};

			ws.onclose = () => {
				close();
			};
		},
		cancel() {
			try {
				ws.close();
			} catch {
				// ignore
			}
		},
	});

	return stream;
}
