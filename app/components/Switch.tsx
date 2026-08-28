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
			className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 ${
				label ? "px-2.5" : ""
			}`}
		>
			<input
				id={inputId}
				type="checkbox"
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
				className="peer sr-only"
			/>
			<span className="relative block h-[28px] w-[48px] flex-none rounded-full bg-line transition peer-checked:bg-accent peer-focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,#3e6ae1_30%,transparent)] after:absolute after:left-[4px] after:top-[4px] after:size-[20px] after:rounded-full after:bg-paper after:shadow-[0_1px_3px_rgba(0,0,0,0.25)] after:transition after:content-[''] peer-checked:after:translate-x-[20px]" />
			{label && (
				<span className="text-sm font-semibold text-ink">{label}</span>
			)}
		</label>
	);
}
