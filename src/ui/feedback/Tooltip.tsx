import { type CSSProperties, type ReactNode, useState } from "react";

export interface TooltipProps {
	label: string;
	/** Keyboard shortcut shown dimmed: "T", "⌘E" */
	shortcut?: string;
	side?: "top" | "bottom" | "left" | "right";
	/** Force open (for specimens) */
	open?: boolean;
	children: ReactNode;
}

const POSITIONS: Record<NonNullable<TooltipProps["side"]>, CSSProperties> = {
	bottom: { top: "100%", left: "50%", transform: "translate(-50%,6px)" },
	top: { bottom: "100%", left: "50%", transform: "translate(-50%,-6px)" },
	right: { left: "100%", top: "50%", transform: "translate(6px,-50%)" },
	left: { right: "100%", top: "50%", transform: "translate(-6px,-50%)" },
};

export function Tooltip({
	label,
	shortcut,
	side = "bottom",
	open,
	children,
}: TooltipProps) {
	const [h, setH] = useState(false);
	const show = open ?? h;
	const pos = POSITIONS[side];
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: обёртка-якорь для наведения — role="group" здесь Biome требует заменить на <fieldset>, что семантически неверно вне формы
		<span
			style={{ position: "relative", display: "inline-flex" }}
			onMouseEnter={() => setH(true)}
			onMouseLeave={() => setH(false)}
		>
			{children}
			{show && (
				<span
					role="tooltip"
					style={{
						position: "absolute",
						...pos,
						zIndex: "var(--z-popover)",
						display: "inline-flex",
						gap: 8,
						alignItems: "center",
						padding: "4px 7px",
						background: "var(--gray-900)",
						color: "#fff",
						borderRadius: "var(--radius-control)",
						font: "var(--type-label)",
						whiteSpace: "nowrap",
						pointerEvents: "none",
					}}
				>
					{label}
					{shortcut && (
						<span
							style={{ color: "var(--gray-400)", font: "var(--type-mono)" }}
						>
							{shortcut}
						</span>
					)}
				</span>
			)}
		</span>
	);
}
