import type { CSSProperties } from "react";
import { IconButton } from "../forms/IconButton";

export interface RecordNavigatorProps {
	/** 1-based */
	index: number;
	total: number;
	onPrev?: () => void;
	onNext?: () => void;
	/** Current record overflows — index turns amber */
	warning?: boolean;
	style?: CSSProperties;
}

export function RecordNavigator({
	index = 1,
	total = 1,
	onPrev,
	onNext,
	warning,
	style,
}: RecordNavigatorProps) {
	return (
		<div
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 2,
				height: 30,
				padding: "0 2px",
				background: "var(--bg-panel)",
				borderRadius: "var(--radius-popover)",
				boxShadow: "var(--shadow-card)",
				...style,
			}}
		>
			<IconButton
				icon="chevron-left"
				label="Предыдущая запись"
				onClick={onPrev}
				disabled={index <= 1}
			/>
			<span
				style={{
					padding: "0 6px",
					font: "var(--type-body)",
					color: "var(--fg-2)",
					whiteSpace: "nowrap",
				}}
			>
				Запись{" "}
				<b
					style={{
						fontWeight: 500,
						color: warning ? "var(--fg-warning)" : "var(--fg-1)",
					}}
				>
					{index}
				</b>{" "}
				из {total}
			</span>
			<IconButton
				icon="chevron-right"
				label="Следующая запись"
				onClick={onNext}
				disabled={index >= total}
			/>
		</div>
	);
}
