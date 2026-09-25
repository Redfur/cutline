import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { useHover } from "../core/hooks";
import { Icon, type IconProps } from "../core/Icon";

export interface ButtonProps {
	/** primary = the one main action per surface (Экспорт); warning = fix-it action inside overflow alerts */
	variant?: "primary" | "secondary" | "ghost" | "warning" | "danger";
	size?: "sm" | "md" | "lg";
	/** Lucide name, leading */
	icon?: IconProps["name"];
	iconRight?: IconProps["name"];
	disabled?: boolean;
	fullWidth?: boolean;
	type?: "button" | "submit";
	title?: string;
	onClick?: (e: MouseEvent) => void;
	children?: ReactNode;
	style?: CSSProperties;
}

const V = {
	primary: {
		bg: "var(--bg-accent)",
		hover: "var(--bg-accent-hover)",
		press: "var(--blue-700)",
		fg: "var(--fg-on-accent)",
		bd: "transparent",
	},
	secondary: {
		bg: "var(--bg-panel)",
		hover: "var(--bg-hover)",
		press: "var(--bg-pressed)",
		fg: "var(--fg-1)",
		bd: "var(--border-2)",
	},
	ghost: {
		bg: "transparent",
		hover: "var(--bg-hover)",
		press: "var(--bg-pressed)",
		fg: "var(--fg-1)",
		bd: "transparent",
	},
	warning: {
		bg: "var(--amber-100)",
		hover: "#ffdf99",
		press: "var(--amber-300)",
		fg: "var(--amber-700)",
		bd: "transparent",
	},
	danger: {
		bg: "var(--bg-panel)",
		hover: "var(--bg-danger)",
		press: "#f9dcdc",
		fg: "var(--fg-danger)",
		bd: "var(--border-2)",
	},
} as const;

export function Button({
	variant = "secondary",
	size = "md",
	icon,
	iconRight,
	disabled,
	fullWidth,
	children,
	onClick,
	type = "button",
	title,
	style,
}: ButtonProps) {
	const [h, p, ev] = useHover();
	const v = V[variant] || V.secondary;
	const H = {
		sm: "var(--control-sm)",
		md: "var(--control-md)",
		lg: "var(--control-lg)",
	}[size];
	return (
		<button
			type={type}
			title={title}
			disabled={disabled}
			onClick={onClick}
			{...ev}
			style={{
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				gap: 6,
				height: H,
				padding: size === "sm" ? "0 8px" : "0 10px",
				width: fullWidth ? "100%" : undefined,
				border: `1px solid ${v.bd}`,
				borderRadius: "var(--radius-control)",
				background: disabled
					? variant === "primary"
						? "var(--gray-300)"
						: v.bg
					: p
						? v.press
						: h
							? v.hover
							: v.bg,
				color: disabled
					? variant === "primary"
						? "#fff"
						: "var(--fg-disabled)"
					: v.fg,
				font:
					size === "lg"
						? "500 var(--text-md)/1 var(--font-ui)"
						: "500 var(--text-sm)/1 var(--font-ui)",
				cursor: disabled ? "default" : "pointer",
				whiteSpace: "nowrap",
				transition: "background var(--duration-fast) var(--ease-out)",
				...style,
			}}
		>
			{icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
			{children}
			{iconRight && <Icon name={iconRight} size={14} />}
		</button>
	);
}
