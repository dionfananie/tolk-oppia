import { useState } from "react";
import {
	defaultModel,
	PROVIDER_META,
	getModels,
	labelForModel,
	type ProviderName,
} from "~/lib/providers";
import { inputClass, selectClass } from "~/lib/ui";

export type ProviderFormValue = {
	provider: ProviderName;
	model: string;
	/** OpenRouter key — kosong artinya pakai key yang sudah tersimpan (server Bila login, atau BYOK lokal). */
	apiKey?: string;
};

type Props = {
	initial?: ProviderFormValue | null;
	onSave: (value: ProviderFormValue) => void;
	submitLabel?: string;
	compact?: boolean;
	/** true = key tak perlu diisi lagi (sudah tersimpan server-side / lokal). Sembunyikan field key. */
	hasStoredKey?: boolean;
};

function sortedModels(provider: ProviderName) {
	return getModels(provider);
}

export function ProviderSetupForm({
	initial,
	onSave,
	submitLabel = "Save",
	compact = false,
	hasStoredKey = false,
}: Props) {
	const [provider, setProvider] = useState<ProviderName>(
		initial?.provider ?? "deepseek",
	);
	const [model, setModel] = useState<string>(
		initial?.model || defaultModel(initial?.provider ?? "deepseek"),
	);
	const [customModel, setCustomModel] = useState(
		initial && !getModels(initial.provider).some((m) => m.id === initial.model) ? initial.model : "",
	);
	const [useCustom, setUseCustom] = useState(Boolean(customModel));
	const [apiKey, setApiKey] = useState(initial?.apiKey ?? "");
	const [error, setError] = useState<string | null>(null);

	function changeProvider(next: ProviderName) {
		setProvider(next);
		const def = defaultModel(next);
		setModel(def);
		setUseCustom(false);
		setCustomModel("");
	}

	function selectModel(id: string) {
		if (id === "__custom__") {
			setUseCustom(true);
			setModel("");
		} else {
			setUseCustom(false);
			setCustomModel("");
			setModel(id);
		}
	}

	const finalModel = useCustom ? customModel.trim() : model;

	function submit(event: React.FormEvent) {
		event.preventDefault();
		if (!finalModel) {
			setError("Pilih atau tulis nama model.");
			return;
		}
		if (!hasStoredKey && !apiKey.trim()) {
			setError("Masukkan key OpenRouter untuk menyambung (atau login dulu untuk pakai key tersimpan).");
			return;
		}
		setError(null);
		onSave({
			provider,
			model: finalModel,
			...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
		});
	}

	return (
		<form onSubmit={submit} className="space-y-4">
			<div className="flex flex-col gap-[7px]">
				<label htmlFor="pv-provider" className="text-sm font-medium text-ink">
					Provider
				</label>
				<select
					id="pv-provider"
					value={provider}
					onChange={(e) => changeProvider(e.target.value as ProviderName)}
					className={selectClass}
				>
					{PROVIDER_META.map((meta) => (
						<option key={meta.provider} value={meta.provider}>
							{meta.label}
						</option>
					))}
				</select>
				<p className="text-sm text-muted">
					{PROVIDER_META.find((p) => p.provider === provider)?.description}
				</p>
			</div>

			<div className="flex flex-col gap-[7px]">
				<label htmlFor="pv-model" className="text-sm font-medium text-ink">
					Model
				</label>
				{useCustom ? (
					<input
						id="pv-model"
						type="text"
						autoComplete="off"
						spellCheck={false}
						value={customModel}
						onChange={(e) => setCustomModel(e.target.value)}
						placeholder="model vendor/nama (cth: deepseek/deepseek-v4-flash)"
						className={inputClass}
					/>
				) : (
					<select
						id="pv-model"
						value={finalModel}
						onChange={(e) => selectModel(e.target.value)}
						className={selectClass}
					>
						<option value="" disabled>
							Pilih model
						</option>
						{sortedModels(provider).map((m) => (
							<option key={m.id} value={m.id}>
								{labelForModel(m.id) || m.label}
							</option>
						))}
						<option value="__custom__">Tulis model custom…</option>
					</select>
				)}
				<p className="text-sm text-muted">
					Model via OpenRouter. Pilih preset atau tulis id custom.
				</p>
			</div>

			{!hasStoredKey && (
				<div className="flex flex-col gap-[7px]">
					<label htmlFor="pv-key" className="text-sm font-medium text-ink">
						API key <span className="text-muted">(OpenRouter)</span>
					</label>
					<input
						id="pv-key"
						type="password"
						autoComplete="off"
						spellCheck={false}
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
						placeholder="sk-or-v1-…"
						className={inputClass}
					/>
					<p className="text-sm text-muted">
						Login untuk simpan key di server (tanpa perlu input ulang). Tanpa login, key
						disimpan di browser (BYOK lokal).
					</p>
				</div>
			)}

			{error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

			<button
				type="submit"
				className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-accent-dark focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper focus:outline-none"
			>
				{submitLabel}
			</button>
			{compact && <p className="sr-only">{submitLabel}</p>}
		</form>
	);
}
