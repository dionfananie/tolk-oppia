import { useState } from "react";
import {
	defaultModel,
	PROVIDER_META,
	getModels,
	labelForModel,
	type ProviderName,
} from "~/lib/providers";
import { testServerKey } from "~/lib/auth";
import { inputClass, selectClass } from "~/lib/ui";

export type ProviderFormValue = {
	provider: ProviderName;
	model: string;
	apiKey?: string;
	/** Base URL custom (optional). Kosong → pakai default provider. */
	baseURL?: string;
};

type Props = {
	initial?: ProviderFormValue | null;
	onSave: (value: ProviderFormValue) => void;
	submitLabel?: string;
	compact?: boolean;
	/** true = key sudah tersimpan di server → sembunyikan field key & gapai tanpa re-input. */
	hasStoredKey?: boolean;
};

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
	const [baseURL, setBaseURL] = useState(initial?.baseURL ?? "");
	const [testing, setTesting] = useState(false);
	const [testMsg, setTestMsg] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	function changeProvider(next: ProviderName) {
		setProvider(next);
		setModel(defaultModel(next));
		setUseCustom(false);
		setCustomModel("");
		setTestMsg(null);
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

	async function handleTest() {
		if (!finalModel || !apiKey.trim()) {
			setTestMsg(null);
			setError("Enter a model and API key first to test the connection.");
			return;
		}
		setError(null);
		setTesting(true);
		setTestMsg(null);
		const r = await testServerKey({
			provider,
			apiKey: apiKey.trim(),
			model: finalModel,
			...(baseURL.trim() ? { baseURL: baseURL.trim() } : {}),
		});
		setTesting(false);
		setTestMsg(r.valid ? "✓ Connection works. Key is valid." : r.error || "Connection failed.");
	}

	function submit(event: React.FormEvent) {
		event.preventDefault();
		if (!finalModel) {
			setError("Pick a model or type a custom one.");
			return;
		}
		if (!hasStoredKey && !apiKey.trim()) {
			setError("Add your API key, or sign in to use a saved one.");
			return;
		}
		setError(null);
		onSave({
			provider,
			model: finalModel,
			...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
			...(baseURL.trim() ? { baseURL: baseURL.trim() } : {}),
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
						placeholder="The provider's model id"
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
						Choose a model
					</option>
					{getModels(provider).map((m) => (
						<option key={m.id} value={m.id}>
							{labelForModel(m.id) || m.label}
						</option>
					))}
					<option value="__custom__">Custom model…</option>
					</select>
				)}
			</div>

			{!hasStoredKey && (
				<div className="flex flex-col gap-[7px]">
					<label htmlFor="pv-key" className="text-sm font-medium text-ink">
						API key
					</label>
					<input
						id="pv-key"
						type="password"
						autoComplete="off"
						spellCheck={false}
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
						placeholder="Paste the provider's API key…"
						className={inputClass}
					/>
					<p className="text-sm text-muted">
						Your key is sent to the TOLK server over HTTPS, validated, and stored
						encrypted. It is never used for requests from your browser.
					</p>
				</div>
			)}

			{!hasStoredKey && (
				<div className="flex flex-col gap-[7px]">
					<label htmlFor="pv-base" className="text-sm font-medium text-ink">
						Base URL <span className="text-muted">(optional)</span>
					</label>
					<input
						id="pv-base"
						type="text"
						autoComplete="off"
						spellCheck={false}
						value={baseURL}
						onChange={(e) => setBaseURL(e.target.value)}
						placeholder="https://… leave empty to use the provider's default"
						className={inputClass}
					/>
					<p className="text-sm text-muted">
						Leave empty to use the provider's default endpoint. Fill it in only for a
						custom HTTPS gateway.
					</p>
				</div>
			)}

			{!hasStoredKey && (
				<button
					type="button"
					onClick={() => void handleTest()}
					disabled={testing || !apiKey.trim()}
					className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 transition hover:bg-surface-strong disabled:opacity-50"
				>
					{testing ? "Testing…" : "Test connection"}
				</button>
			)}

			{testMsg && (
				<p
					className={`rounded-md px-3 py-2 text-sm ${
						testMsg.startsWith("✓") ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
					}`}
				>
					{testMsg}
				</p>
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
