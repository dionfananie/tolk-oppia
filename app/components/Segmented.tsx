type Props = {
	value: string;
	onChange: (value: string) => void;
	options: { value: string; label: string }[];
	label?: string;
};

export function Segmented({ value, onChange, options, label }: Props) {
	return (
		<div role="group" aria-label={label} className="inline-flex">
			{options.map((option, index) => {
				const active = option.value === value;
				const isFirst = index === 0;
				const isLast = index === options.length - 1;
				return (
					<button
						key={option.value}
						type="button"
						aria-pressed={active}
						onClick={() => onChange(option.value)}
						className={`min-h-[40px] border border-line px-4 py-2 text-sm font-medium transition-colors focus:z-10 focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper focus:outline-none ${
							isFirst ? "rounded-s-sm" : "-ms-px"
						} ${isLast ? "rounded-e-sm" : ""} ${
							active
								? "bg-accent text-paper"
								: "bg-paper text-ink-2 hover:bg-surface hover:text-ink"
						}`}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
