import type { CSSProperties, MouseEvent } from "react";
import { useHover } from "../core/hooks";
import { Icon, type IconProps } from "../core/Icon";

export interface IconButtonProps {
	icon: IconProps["name"];
	/** Accessible label + native tooltip. Required. */
	label: string;
	/** tool = 36px square for the vertical toolbar */
	size?: "sm" | "md" | "lg" | "tool";
	/** Selected/toggled state (current tool, lock on) */
	active?: boolean;
	disabled?: boolean;
	tone?: "default" | "warning";
	onClick?: (e: MouseEvent) => void;
	style?: CSSProperties;
}

const SIZES = { sm: 22, md: 26, lg: 32, tool: 36 } as const;

export function IconButton({
	icon,
	label,
	size = "md",
	active,
	disabled,
	tone,
	onClick,
	style,
}: IconButtonProps) {
	const [h, p, ev] = useHover();
	const S = SIZES[size] || 26;
	const bg = active
		? "var(--bg-selected)"
		: p
			? "var(--bg-pressed)"
			: h
				? "var(--bg-hover)"
				: "transparent";
	const fg = disabled
		? "var(--fg-disabled)"
		: active
			? "var(--fg-accent)"
			: tone === "warning"
				? "var(--overflow)"
				: h
					? "var(--fg-1)"
					: "var(--fg-2)";
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			aria-pressed={active}
			disabled={disabled}
			onClick={onClick}
			{...ev}
			style={{
				width: S,
				height: S,
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				border: 0,
				borderRadius: "var(--radius-control)",
				background: disabled ? "transparent" : bg,
				color: fg,
				cursor: disabled ? "default" : "pointer",
				padding: 0,
				flex: "none",
				transition: "background var(--duration-fast) var(--ease-out)",
				...style,
			}}
		>
			<Icon name={icon} size={size === "sm" ? 14 : 16} />
		</button>
	);
}
