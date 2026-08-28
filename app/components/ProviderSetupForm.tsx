import { useState } from "react";
import { PROVIDER_META, defaultModel, getModels, type ProviderName } from "~/lib/providers";
import type { Setup } from "~/lib/storage";

type Props = {
	initial?: Setup | null;
	onSave: (setup: Setup) => void;
	submitLabel?: string;
	compact?: boolean;
};

const FIELD_INPUT =
	"w-full rounded-[4px] border border-meta bg-paper px-3.5 py-3 text-base text-ink placeholder:text-meta transition hover:border-ink-2 focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,#3e6ae1_30%,transparent)] focus:outline-none";

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
	const [apiKey, setApiKey] = useState(initial?.apiKey ?? "");
	const [error, setError] = useState<string | null>(null);

	const models = getModels(provider);

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
		onSave({ provider, model, apiKey: apiKey.trim(), level: initial?.level ?? "intermediate" });
	}

	return (
		<form onSubmit={submit} className="space-y-5">
			<div>
				<p className="mb-2 text-sm font-semibold text-ink">Provider</p>
				<div className={`grid gap-3 ${compact ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
					{PROVIDER_META.map((meta) => {
						const active = provider === meta.provider;
						return (
							<button
								key={meta.provider}
								type="button"
								onClick={() => changeProvider(meta.provider)}
								aria-pressed={active}
								className={`rounded-xl border p-4 text-left transition ${
									active
										? "border-accent shadow-[0_0_0_3px_color-mix(in_oklab,#3e6ae1_30%,transparent)]"
										: "border-line bg-paper hover:border-meta"
								}`}
							>
								<p className="flex items-center gap-2 text-sm font-semibold text-ink">
									<span
										className={`size-4 rounded-full border-2 transition ${
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
				<label htmlFor="model" className="text-sm font-semibold text-ink">
					Model
				</label>
				<select
					id="model"
					value={model}
					onChange={(event) => setModel(event.target.value)}
					className={FIELD_INPUT}
				>
					{models.map((m) => (
						<option key={m.id} value={m.id}>
							{m.id} · {m.description}
						</option>
					))}
				</select>
			</div>

			<div className="flex flex-col gap-[7px]">
				<label htmlFor="api-key" className="text-sm font-semibold text-ink">
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
					className={FIELD_INPUT}
				/>
				<p className="text-sm text-muted">
					Your key is used only for AI requests from this browser and is never stored.
				</p>
			</div>

			{error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

			<button
				type="submit"
				className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent/40"
			>
				{submitLabel}
			</button>
		</form>
	);
}
