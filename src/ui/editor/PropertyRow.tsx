import type { CSSProperties, ReactNode } from "react";

export interface PropertyRowProps {
	/** Left label column (76px). Omit to use full width. */
	label?: string;
	/** Split children into N equal columns */
	columns?: number;
	children: ReactNode;
	style?: CSSProperties;
}

export function PropertyRow({
	label,
	columns,
	children,
	style,
}: PropertyRowProps) {
	const grid: CSSProperties = columns
		? {
				display: "grid",
				gridTemplateColumns: `repeat(${columns},minmax(0,1fr))`,
				gap: 6,
			}
		: { display: "flex", gap: 6, alignItems: "center" };
	if (!label) {
		return <div style={{ ...grid, ...style }}>{children}</div>;
	}
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "76px minmax(0,1fr)",
				alignItems: "center",
				gap: 8,
				...style,
			}}
		>
			<span style={{ font: "var(--type-label)", color: "var(--fg-2)" }}>
				{label}
			</span>
			<div style={{ ...grid, minWidth: 0 }}>{children}</div>
		</div>
	);
}
