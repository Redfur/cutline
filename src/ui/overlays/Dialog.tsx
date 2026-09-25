import type { CSSProperties, ReactNode } from "react";
import { IconButton } from "../forms/IconButton";

export interface DialogProps {
	open?: boolean;
	title: string;
	children?: ReactNode;
	/** Right-aligned buttons; primary last */
	footer?: ReactNode;
	onClose?: () => void;
	width?: number;
	/** Render without the scrim (specimens, embedding) */
	inline?: boolean;
	style?: CSSProperties;
}

export function Dialog({
	open = true,
	title,
	children,
	footer,
	onClose,
	width = 440,
	inline,
	style,
}: DialogProps) {
	if (!open) return null;
	const box = (
		<div
			role="dialog"
			aria-label={title}
			style={{
				width,
				maxWidth: "100%",
				background: "var(--bg-panel)",
				borderRadius: "var(--radius-popover)",
				boxShadow: "var(--shadow-dialog)",
				display: "flex",
				flexDirection: "column",
				...style,
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					height: 44,
					padding: "0 8px 0 16px",
					borderBottom: "1px solid var(--border-1)",
				}}
			>
				<div style={{ flex: 1, font: "var(--type-heading)" }}>{title}</div>
				{onClose && <IconButton icon="x" label="Закрыть" onClick={onClose} />}
			</div>
			<div style={{ padding: 16, display: "grid", gap: 12 }}>{children}</div>
			{footer && (
				<div
					style={{
						display: "flex",
						justifyContent: "flex-end",
						gap: 8,
						padding: "10px 16px",
						borderTop: "1px solid var(--border-1)",
						background: "var(--bg-subtle)",
						borderRadius: "0 0 var(--radius-popover) var(--radius-popover)",
					}}
				>
					{footer}
				</div>
			)}
		</div>
	);
	if (inline) return box;
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: затемнение-скрим стандартного модального диалога — закрытие по клику вне box, сам диалог доступен через role="dialog" внутри
		<div
			onMouseDown={(e) => {
				if (e.target === e.currentTarget && onClose) onClose();
			}}
			style={{
				position: "fixed",
				inset: 0,
				zIndex: "var(--z-dialog)",
				background: "rgba(27,29,32,.32)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: 24,
			}}
		>
			{box}
		</div>
	);
}
