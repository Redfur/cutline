import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconProps } from "../core/Icon";

export interface BadgeProps {
	/** solidWarning = amber fill, used as the on-canvas overflow tag */
	tone?:
		| "neutral"
		| "accent"
		| "warning"
		| "danger"
		| "success"
		| "solidWarning";
	icon?: IconProps["name"];
	mono?: boolean;
	children?: ReactNode;
	style?: CSSProperties;
}

const T = {
	neutral: ["var(--gray-100)", "var(--fg-2)"],
	accent: ["var(--blue-50)", "var(--fg-accent)"],
	warning: ["var(--amber-100)", "var(--fg-warning)"],
	danger: ["var(--red-50)", "var(--fg-danger)"],
	success: ["#e6f4ec", "var(--fg-success)"],
	solidWarning: ["var(--overflow)", "#fff"],
} as const;

export function Badge({
	tone = "neutral",
	icon,
	children,
	mono,
	style,
}: BadgeProps) {
	const [bg, fg] = T[tone] || T.neutral;
	return (
		<span
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 4,
				height: 18,
				padding: "0 6px",
				borderRadius: "var(--radius-1)",
				background: bg,
				color: fg,
				font: mono
					? "500 var(--text-2xs)/1 var(--font-mono)"
					: "500 var(--text-xs)/1 var(--font-ui)",
				whiteSpace: "nowrap",
				...style,
			}}
		>
			{icon && <Icon name={icon} size={12} strokeWidth={2} />}
			{children}
		</span>
	);
}
