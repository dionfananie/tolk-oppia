import { Link } from "react-router";
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const BASE =
	"inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-paper focus:outline-none disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<Variant, string> = {
	primary: "bg-accent text-paper hover:bg-accent-dark",
	secondary: "border border-line bg-paper text-ink hover:bg-surface",
	ghost: "text-accent hover:bg-accent/10",
};

const SIZES: Record<Size, string> = {
	sm: "min-h-[38px] px-3.5 py-2 text-[13px]",
	md: "min-h-[44px] px-5 py-2.5 text-sm",
	lg: "min-h-[52px] px-7 py-3.5 text-base",
};

type CommonProps = {
	variant?: Variant;
	size?: Size;
	className?: string;
	children: ReactNode;
};

type ButtonAsButton = CommonProps & {
	to?: never;
	onClick?: MouseEventHandler<HTMLButtonElement>;
	type?: "button" | "submit";
	disabled?: boolean;
	"aria-label"?: string;
	title?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "type" | "onClick">;

type ButtonAsLink = CommonProps & {
	to: string;
	"aria-label"?: string;
};

type Props = ButtonAsButton | ButtonAsLink;

export function Button(props: Props) {
	const { variant = "primary", size = "md", className = "", children } = props;
	const classes = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

	if ("to" in props && props.to) {
		return (
			<Link to={props.to} aria-label={props["aria-label"]} className={classes}>
				{children}
			</Link>
		);
	}

	const { onClick, type = "button", disabled, "aria-label": ariaLabel, title } =
		props as ButtonAsButton;
	return (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled}
			aria-label={ariaLabel}
			title={title}
			className={classes}
		>
			{children}
		</button>
	);
}
