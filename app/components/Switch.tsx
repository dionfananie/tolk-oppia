type Props = {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label?: string;
	id?: string;
};

export function Switch({ checked, onChange, label, id }: Props) {
	const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
	return (
		<label
			htmlFor={inputId}
			className={`inline-flex items-center gap-2.5 ${label ? "cursor-pointer" : ""}`}
		>
			<input
				id={inputId}
				type="checkbox"
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
				className="peer sr-only"
			/>
			<span className="relative block h-8 w-14 flex-none rounded-full bg-line transition-colors [-webkit-tap-highlight-color:transparent] after:absolute after:inset-y-0 after:start-0 after:m-1 after:size-6 after:rounded-full after:bg-paper after:shadow-sm after:transition-[inset-inline-start] after:content-[''] peer-checked:bg-accent peer-checked:after:start-6 peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper" />
			{label && <span className="text-sm font-medium text-ink">{label}</span>}
		</label>
	);
}
