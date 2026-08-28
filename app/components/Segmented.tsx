type Props = {
	value: string;
	onChange: (value: string) => void;
	options: { value: string; label: string }[];
	label?: string;
};

export function Segmented({ value, onChange, options, label }: Props) {
	return (
		<div
			role="group"
			aria-label={label}
			className="inline-flex gap-[2px] rounded-full border border-line-soft bg-surface p-[3px]"
		>
			{options.map((option) => {
				const active = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						aria-pressed={active}
						onClick={() => onChange(option.value)}
						className={`min-h-[38px] rounded-full px-4 text-sm font-semibold transition ${
							active
								? "bg-paper text-ink shadow-[0_1px_4px_rgba(0,0,0,0.07)]"
								: "text-muted hover:text-ink"
						}`}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
