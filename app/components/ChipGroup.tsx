type Props = {
	value: string;
	onChange: (value: string) => void;
	options: { value: string; label: string }[];
	label?: string;
};

export function ChipGroup({ value, onChange, options, label }: Props) {
	return (
		<div role="group" aria-label={label} className="flex flex-wrap gap-2">
			{options.map((option) => {
				const active = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						aria-pressed={active}
						onClick={() => onChange(option.value)}
						className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition ${
							active
								? "border-ink bg-ink text-paper"
								: "border-line bg-paper text-ink-2 hover:border-meta hover:text-ink"
						}`}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
