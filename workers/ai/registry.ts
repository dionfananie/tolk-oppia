// registry.ts — Single source of truth utk provider AI yang didukung (BYOK multi-provider).
// Base URL & model diverifikasi dari dokumentasi resmi / agregasi OpenAI-compatible (2026-08).
// Model dapat di-update di sini tanpa mengubah UI.

import type { AIProviderId, ModelDefinition, ProviderConfig } from "./types";

export const PROVIDERS: ProviderConfig[] = [
	{
		id: "openai",
		name: "OpenAI",
		adapter: "openai-compatible",
		baseURL: "https://api.openai.com/v1",
		supports: { streaming: true, tools: true, vision: true },
		models: [
			{ id: "gpt-4o", name: "GPT-4o", capabilities: { chat: true, vision: true, tools: true, structuredOutput: true } },
			{ id: "gpt-4o-mini", name: "GPT-4o mini", capabilities: { chat: true, vision: true, tools: true, structuredOutput: true } },
			{ id: "gpt-4.1", name: "GPT-4.1", capabilities: { chat: true, vision: true, tools: true, structuredOutput: true } },
			{ id: "o3-mini", name: "o3 mini", capabilities: { chat: true, vision: false, tools: true, structuredOutput: true } },
		],
	},
	{
		id: "deepseek",
		name: "DeepSeek",
		adapter: "openai-compatible",
		baseURL: "https://api.deepseek.com/v1",
		supports: { streaming: true, tools: true, vision: false },
		models: [
			{ id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", capabilities: { chat: true, vision: false, tools: true, structuredOutput: true } },
			{ id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", capabilities: { chat: true, vision: false, tools: true, structuredOutput: true } },
			{ id: "deepseek-v4-flash-vision-exp", name: "DeepSeek V4 Flash Vision (Exp)", capabilities: { chat: true, vision: true, tools: true, structuredOutput: true } },
		],
	},
	{
		id: "anthropic",
		name: "Anthropic (Claude)",
		adapter: "openai-compatible",
		baseURL: "https://api.anthropic.com/v1",
		supports: { streaming: true, tools: true, vision: true },
		models: [
			{ id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", capabilities: { chat: true, vision: true, tools: true, structuredOutput: true } },
			{ id: "claude-haiku-4-5", name: "Claude Haiku 4.5", capabilities: { chat: true, vision: true, tools: true, structuredOutput: true } },
			{ id: "claude-opus-4-1", name: "Claude Opus 4.1", capabilities: { chat: true, vision: true, tools: true, structuredOutput: true } },
		],
	},
	{
		id: "gemini",
		name: "Google Gemini",
		adapter: "openai-compatible",
		baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
		supports: { streaming: true, tools: true, vision: true },
		models: [
			{ id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", capabilities: { chat: true, vision: true, tools: true, structuredOutput: true } },
			{ id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", capabilities: { chat: true, vision: true, tools: true, structuredOutput: true } },
			{ id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", capabilities: { chat: true, vision: true, tools: true, structuredOutput: true } },
		],
	},
	{
		id: "openrouter",
		name: "OpenRouter",
		adapter: "openai-compatible",
		baseURL: "https://openrouter.ai/api/v1",
		supports: { streaming: true, tools: true, vision: true },
		models: [
			{ id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash (via OR)", capabilities: { chat: true, vision: false, tools: true, structuredOutput: true } },
			{ id: "anthropic/claude-sonnet-4-5", name: "Claude Sonnet 4.5 (via OR)", capabilities: { chat: true, vision: true, tools: true, structuredOutput: true } },
			{ id: "openai/gpt-4o", name: "GPT-4o (via OR)", capabilities: { chat: true, vision: true, tools: true, structuredOutput: true } },
		],
	},
	{
		id: "groq",
		name: "Groq",
		adapter: "openai-compatible",
		baseURL: "https://api.groq.com/openai/v1",
		supports: { streaming: true, tools: true, vision: false },
		models: [
			{ id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile", capabilities: { chat: true, vision: false, tools: true, structuredOutput: true } },
			{ id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", capabilities: { chat: true, vision: false, tools: true, structuredOutput: true } },
			{ id: "gemma2-9b-it", name: "Gemma 2 9B IT", capabilities: { chat: true, vision: false, tools: true, structuredOutput: false } },
		],
	},
	{
		id: "together",
		name: "Together AI",
		adapter: "openai-compatible",
		baseURL: "https://api.together.xyz/v1",
		supports: { streaming: true, tools: true, vision: true },
		models: [
			{ id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", name: "Llama 3.3 70B Instruct", capabilities: { chat: true, vision: false, tools: true, structuredOutput: true } },
			{ id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3", capabilities: { chat: true, vision: false, tools: true, structuredOutput: true } },
			{ id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen2.5 72B Instruct", capabilities: { chat: true, vision: false, tools: true, structuredOutput: true } },
		],
	},
];

const BY_ID = new Map<string, ProviderConfig>();
for (const p of PROVIDERS) BY_ID.set(p.id, p);

export function getProvider(id: string): ProviderConfig | undefined {
	return BY_ID.get(id);
}

export function providerNames(): { id: AIProviderId; name: string }[] {
	return PROVIDERS.map((p) => ({ id: p.id, name: p.name }));
}

export function getProviderModels(id: string): ModelDefinition[] {
	return getProvider(id)?.models ?? [];
}
