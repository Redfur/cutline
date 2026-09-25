import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconProps } from "../core/Icon";

export interface InlineAlertProps {
	tone?: "warning" | "danger" | "info";
	title: ReactNode;
	children?: ReactNode;
	/** Buttons (size="sm") that fix the problem */
	actions?: ReactNode;
	style?: CSSProperties;
}

const T: Record<
	NonNullable<InlineAlertProps["tone"]>,
	[string, string, string, IconProps["name"]]
> = {
	warning: [
		"var(--bg-warning)",
		"var(--amber-300)",
		"var(--overflow)",
		"triangle-alert",
	],
	danger: ["var(--bg-danger)", "#f2b8b8", "var(--red-500)", "circle-alert"],
	info: ["var(--bg-subtle)", "var(--border-1)", "var(--fg-2)", "circle-alert"],
};

export function InlineAlert({
	tone = "warning",
	title,
	children,
	actions,
	style,
}: InlineAlertProps) {
	const [bg, bd, ic, icon] = T[tone] || T.warning;
	return (
		<div
			role="alert"
			style={{
				display: "grid",
				gridTemplateColumns: "16px 1fr",
				gap: "2px 8px",
				padding: "8px 10px",
				background: bg,
				border: `1px solid ${bd}`,
				borderRadius: "var(--radius-control)",
				...style,
			}}
		>
			<span style={{ color: ic, marginTop: 1 }}>
				<Icon name={icon} size={16} />
			</span>
			<div
				style={{
					font: "var(--weight-medium) var(--text-sm)/var(--lh-sm) var(--font-ui)",
					color: "var(--fg-1)",
				}}
			>
				{title}
			</div>
			{children && (
				<div
					style={{
						gridColumn: 2,
						font: "var(--type-label)",
						color: "var(--fg-2)",
					}}
				>
					{children}
				</div>
			)}
			{actions && (
				<div
					style={{
						gridColumn: 2,
						display: "flex",
						gap: 6,
						marginTop: 6,
						flexWrap: "wrap",
					}}
				>
					{actions}
				</div>
			)}
		</div>
	);
}
