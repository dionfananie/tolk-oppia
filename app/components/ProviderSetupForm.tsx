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
			setError("Isi model & API key dulu untuk menguji koneksi.");
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
		setTestMsg(r.valid ? "✓ Koneksi berhasil. Key valid." : r.error || "Koneksi gagal.");
	}

	function submit(event: React.FormEvent) {
		event.preventDefault();
		if (!finalModel) {
			setError("Pilih atau tulis nama model.");
			return;
		}
		if (!hasStoredKey && !apiKey.trim()) {
			setError("Masukkan API key provider (atau login & pakai key yang sudah tersimpan).");
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
						placeholder="id model asli provider"
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
						{getModels(provider).map((m) => (
							<option key={m.id} value={m.id}>
								{labelForModel(m.id) || m.label}
							</option>
						))}
						<option value="__custom__">Tulis model custom…</option>
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
						placeholder="Masukkan key provider…"
						className={inputClass}
					/>
					<p className="text-sm text-muted">
						Key dikirim ke TOLK server (HTTPS) untuk divalidasi, lalu disimpan terenkripsi.
						Key tidak akan digunakan untuk request dari browser.
					</p>
				</div>
			)}

			{!hasStoredKey && (
				<div className="flex flex-col gap-[7px]">
					<label htmlFor="pv-base" className="text-sm font-medium text-ink">
						Base URL <span className="text-muted">(opsional)</span>
					</label>
					<input
						id="pv-base"
						type="text"
						autoComplete="off"
						spellCheck={false}
						value={baseURL}
						onChange={(e) => setBaseURL(e.target.value)}
						placeholder="https://… pakai default provider bila kosong"
						className={inputClass}
					/>
					<p className="text-sm text-muted">
						Kosongkan untuk memakai endpoint default provider. Isi hanya untuk gateway/endpoint
						kustom (https).
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
					{testing ? "Testing…" : "Test Connection"}
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
