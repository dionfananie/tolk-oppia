const CHAT_API = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
const TTS_API = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

export const QWEN_CHAT_MODEL = "qwen3.7-flash";
export const QWEN_ASR_MODEL = "qwen3-asr-flash";
export const QWEN_TTS_MODEL = "qwen3-tts-flash";

function auth(apiKey: string): HeadersInit {
	return { authorization: `Bearer ${apiKey.trim()}` };
}

export async function qwenChat(apiKey: string, input: {
	model?: string;
	messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}): Promise<Response> {
	const response = await fetch(CHAT_API, {
		method: "POST",
		headers: { ...auth(apiKey), "content-type": "application/json" },
		body: JSON.stringify({
			model: input.model || QWEN_CHAT_MODEL,
			messages: input.messages,
			temperature: 0.7,
			max_tokens: 1024,
		}),
	});
	return response;
}

export async function qwenTranscribe(apiKey: string, audio: ArrayBuffer, contentType: string): Promise<Response> {
	const bytes = new Uint8Array(audio);
	let binary = "";
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
	}
	const audioData = btoa(binary);
	const response = await fetch(CHAT_API, {
		method: "POST",
		headers: { ...auth(apiKey), "content-type": "application/json" },
		body: JSON.stringify({
			model: QWEN_ASR_MODEL,
			messages: [{
				role: "user",
				content: [
					{ type: "input_audio", input_audio: { data: `data:${contentType || "audio/webm"};base64,${audioData}` } },
					{ type: "text", text: "Transcribe the audio exactly. Return only the transcript." },
				],
			}],
		}),
	});
	if (!response.ok) return response;
	const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
	return Response.json({ transcript: data.choices?.[0]?.message?.content?.trim() ?? "" });
}

export async function qwenSpeak(apiKey: string, text: string, voice = "Cherry"): Promise<Response> {
	const response = await fetch(TTS_API, {
		method: "POST",
		headers: { ...auth(apiKey), "content-type": "application/json" },
		body: JSON.stringify({
			model: QWEN_TTS_MODEL,
			input: { text, voice },
			parameters: { format: "mp3" },
		}),
	});
	if (!response.ok) return response;
	const data = (await response.json()) as { output?: { audio?: { url?: string; data?: string } } };
	const audio = data.output?.audio;
	if (audio?.url) {
		const upstream = await fetch(audio.url);
		return new Response(upstream.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
	}
	if (audio?.data) {
		const binary = atob(audio.data);
		const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
		return new Response(bytes, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
	}
	return Response.json({ error: "Qwen TTS response did not contain audio" }, { status: 502 });
}
