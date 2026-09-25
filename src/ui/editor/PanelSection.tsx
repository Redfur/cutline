import { type CSSProperties, type ReactNode, useState } from "react";
import { Icon } from "../core/Icon";

export interface PanelSectionProps {
	title: ReactNode;
	/** Small ghost buttons at the right of the header */
	actions?: ReactNode;
	children?: ReactNode;
	collapsible?: boolean;
	defaultOpen?: boolean;
	/** Amber tint + icon — this section holds the fix for a warning */
	warning?: boolean;
	style?: CSSProperties;
}

export function PanelSection({
	title,
	actions,
	children,
	collapsible,
	defaultOpen = true,
	warning,
	style,
}: PanelSectionProps) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<section
			style={{
				borderBottom: "1px solid var(--border-1)",
				background: warning ? "var(--bg-warning)" : undefined,
				...style,
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 4,
					height: 32,
					padding: "0 8px 0 12px",
				}}
			>
				{(() => {
					const headerStyle: CSSProperties = {
						flex: 1,
						display: "flex",
						alignItems: "center",
						gap: 4,
						font: "var(--type-section)",
						color: "var(--fg-1)",
						cursor: collapsible ? "pointer" : "default",
						userSelect: "none",
					};
					const content = (
						<>
							{collapsible && (
								<span style={{ color: "var(--fg-3)", marginLeft: -4 }}>
									<Icon
										name={open ? "chevron-down" : "chevron-right"}
										size={12}
									/>
								</span>
							)}
							{warning && (
								<span style={{ color: "var(--overflow)" }}>
									<Icon name="triangle-alert" size={12} strokeWidth={2} />
								</span>
							)}
							{title}
						</>
					);
					return collapsible ? (
						<button
							type="button"
							onClick={() => setOpen(!open)}
							style={{
								...headerStyle,
								border: 0,
								background: "transparent",
								padding: 0,
								textAlign: "left",
							}}
						>
							{content}
						</button>
					) : (
						<div style={headerStyle}>{content}</div>
					);
				})()}
				{actions && (
					<div style={{ display: "flex", alignItems: "center", gap: 2 }}>
						{actions}
					</div>
				)}
			</div>
			{open && children && (
				<div style={{ padding: "0 12px 12px", display: "grid", gap: 6 }}>
					{children}
				</div>
			)}
		</section>
	);
}
