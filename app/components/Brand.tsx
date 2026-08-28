import { Link } from "react-router";

type Props = {
	to?: string;
	dark?: boolean;
};

export function Brand({ to = "/", dark = false }: Props) {
	const wordmark = dark
		? "font-display text-[17px] font-medium tracking-[0.22em] text-paper"
		: "font-display text-[17px] font-medium tracking-[0.22em] text-ink";
	const mark = dark
		? "bg-paper text-ink"
		: "bg-ink text-paper";

	return (
		<Link to={to} className="group inline-flex items-center gap-2">
			<span
				className={`grid size-[22px] place-items-center rounded-full font-mono text-[10px] font-bold leading-none ${mark}`}
			>
				T
			</span>
			<span className={wordmark}>TOLK</span>
		</Link>
	);
}
