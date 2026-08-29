import { useState } from "react";
import {
	defaultModel,
	PROVIDER_DEFAULT_BASE_URLS,
	PROVIDER_META,
	type ProviderName,
} from "~/lib/providers";
import type { Setup } from "~/lib/storage";
import { inputClass } from "~/lib/ui";

type Props = {
	initial?: Setup | null;
	onSave: (setup: Setup) => void;
	submitLabel?: string;
	compact?: boolean;
};

export function ProviderSetupForm({
	initial,
	onSave,
	submitLabel = "Save & Connect",
	compact = false,
}: Props) {
	const [provider, setProvider] = useState<ProviderName>(initial?.provider ?? "deepseek");
	const [model, setModel] = useState<string>(
		initial?.model || defaultModel(initial?.provider ?? "deepseek"),
	);
	const [baseUrl, setBaseUrl] = useState<string>(initial?.baseUrl ?? "");
	const [apiKey, setApiKey] = useState(initial?.apiKey ?? "");
	const [error, setError] = useState<string | null>(null);

	function changeProvider(next: ProviderName) {
		setProvider(next);
		setModel(defaultModel(next));
	}

	function submit(event: React.FormEvent) {
		event.preventDefault();
		if (!apiKey.trim()) {
			setError("Enter your API key to continue.");
			return;
		}
		setError(null);
		onSave({
			provider,
			model: model.trim() || defaultModel(provider),
			apiKey: apiKey.trim(),
			...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
			level: initial?.level ?? "intermediate",
		});
	}

	return (
		<form onSubmit={submit} className="space-y-5">
			<div>
				<p className="mb-2 text-sm font-medium text-ink">Provider</p>
				<div className={`grid gap-3 ${compact ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
					{PROVIDER_META.map((meta) => {
						const active = provider === meta.provider;
						return (
							<button
								key={meta.provider}
								type="button"
								onClick={() => changeProvider(meta.provider)}
								aria-pressed={active}
								className={`rounded-lg border p-4 text-left transition-colors focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper focus:outline-none ${
									active
										? "border-accent bg-accent/5"
										: "border-line bg-paper hover:border-meta hover:bg-surface"
								}`}
							>
								<p className="flex items-center gap-2 text-sm font-semibold text-ink">
									<span
										className={`size-4 rounded-full border-2 transition-colors ${
											active ? "border-[5px] border-accent" : "border-line"
										}`}
									/>
									{meta.label}
								</p>
								<p className="mt-1.5 text-xs leading-relaxed text-muted">
									{meta.description}
								</p>
							</button>
						);
					})}
				</div>
			</div>

			<div className="flex flex-col gap-[7px]">
				<label htmlFor="model" className="text-sm font-medium text-ink">
					Model
				</label>
				<input
					id="model"
					type="text"
					autoComplete="off"
					spellCheck={false}
					value={model}
					onChange={(event) => setModel(event.target.value)}
					placeholder={defaultModel(provider)}
					list="model-suggestions"
					className={inputClass}
				/>
				<datalist id="model-suggestions">
					{PROVIDER_META.flatMap((p) => p.models.map((m) => m.id)).map((id) => (
						<option key={id} value={id} />
					))}
				</datalist>
				<p className="text-sm text-muted">
					Any model your provider supports, e.g. gpt-4o-mini, llama-3.3-70b, glm-4-plus.
				</p>
			</div>

			<div className="flex flex-col gap-[7px]">
				<label htmlFor="base-url" className="text-sm font-medium text-ink">
					Base URL <span className="text-muted">(optional)</span>
				</label>
				<input
					id="base-url"
					type="text"
					autoComplete="off"
					spellCheck={false}
					value={baseUrl}
					onChange={(event) => setBaseUrl(event.target.value)}
					placeholder={PROVIDER_DEFAULT_BASE_URLS[provider]}
					className={`${inputClass} font-mono`}
				/>
				<p className="text-sm text-muted">
					Leave empty for this provider's default, or set a custom OpenAI-compatible base URL.
				</p>
			</div>

			<div className="flex flex-col gap-[7px]">
				<label htmlFor="api-key" className="text-sm font-medium text-ink">
					API key
				</label>
				<input
					id="api-key"
					type="password"
					autoComplete="off"
					spellCheck={false}
					value={apiKey}
					onChange={(event) => setApiKey(event.target.value)}
					placeholder={`Paste your ${provider} API key`}
					className={inputClass}
				/>
				<p className="text-sm text-muted">
					Your key is used only for AI requests from this browser and is never stored.
				</p>
			</div>

			{error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

			<button
				type="submit"
				className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-accent-dark focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper focus:outline-none"
			>
				{submitLabel}
			</button>
		</form>
	);
}
