import { Link } from "react-router";
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const BASE =
	"btn inline-flex items-center justify-center gap-2 rounded-full focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-base-100 focus:outline-none";

const VARIANTS: Record<Variant, string> = {
	primary: "btn-primary",
	secondary: "btn btn-outline",
	ghost: "btn-ghost text-primary",
};

const SIZES: Record<Size, string> = {
	sm: "btn-sm",
	md: "btn-md",
	lg: "btn-lg",
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
