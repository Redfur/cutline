import type { CSSProperties } from "react";

export interface FieldTokenProps {
	/** Column name from the data table */
	name: string;
	/** Column not found — red, struck through */
	missing?: boolean;
	/** Example value shown on hover */
	sample?: string;
	style?: CSSProperties;
}

export function FieldToken({ name, missing, sample, style }: FieldTokenProps) {
	return (
		<span
			title={missing ? "Столбца нет в таблице" : sample}
			style={{
				display: "inline-flex",
				alignItems: "center",
				height: 18,
				padding: "0 5px",
				borderRadius: "var(--radius-1)",
				background: missing ? "var(--bg-danger)" : "var(--blue-50)",
				color: missing ? "var(--fg-danger)" : "var(--fg-accent)",
				font: "500 var(--text-xs)/1 var(--font-mono)",
				whiteSpace: "nowrap",
				textDecoration: missing ? "line-through" : "none",
				...style,
			}}
		>
			{"{{"}
			{name}
			{"}}"}
		</span>
	);
}
