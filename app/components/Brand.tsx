import { Link } from "react-router";

type Props = {
	to?: string;
	dark?: boolean;
};

export function Brand({ to = "/", dark = false }: Props) {
	const wordmark = dark
		? "font-display text-[17px] font-medium tracking-[0.22em] text-paper"
		: "font-display text-[17px] font-medium tracking-[0.22em] text-ink";

	return (
		<Link to={to} className="group inline-flex items-center gap-2">
			<img src="/logo.png" alt="" className="size-[22px] rounded-full object-cover" />
			<span className={wordmark}>TOLK</span>
		</Link>
	);
}
