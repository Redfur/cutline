import type { CSSProperties } from "react";
import { Icon, type IconProps } from "../core/Icon";

export interface SegmentedOption {
	value: string;
	label?: string;
	icon?: IconProps["name"];
	title?: string;
}

export interface SegmentedControlProps {
	options: SegmentedOption[];
	value: string;
	onChange?: (value: string) => void;
	/** lg = the top-bar «Дизайн | Данные» switch */
	size?: "sm" | "md" | "lg";
	fullWidth?: boolean;
	style?: CSSProperties;
}

export function SegmentedControl({
	options = [],
	value,
	onChange,
	size = "md",
	fullWidth,
	style,
}: SegmentedControlProps) {
	const H = size === "sm" ? 22 : size === "lg" ? 30 : 26;
	return (
		<div
			role="radiogroup"
			style={{
				display: fullWidth ? "flex" : "inline-flex",
				height: H,
				padding: 2,
				gap: 2,
				background: "var(--gray-100)",
				borderRadius: "var(--radius-control)",
				...style,
			}}
		>
			{options.map((o) => {
				const on = o.value === value;
				return (
					// biome-ignore lint/a11y/useSemanticElements: визуально стилизованные сегменты — нативный <input type="radio"> здесь не даёт того же вида; role="radio" на <button> сохраняет исходный вид дизайн-системы
					<button
						key={o.value}
						type="button"
						role="radio"
						aria-checked={on}
						title={o.title || o.label}
						onClick={() => onChange?.(o.value)}
						style={{
							flex: fullWidth ? 1 : "none",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 5,
							minWidth: o.label ? undefined : H + 2,
							padding: o.label ? (size === "lg" ? "0 14px" : "0 8px") : 0,
							border: 0,
							borderRadius: "var(--radius-1)",
							background: on ? "var(--bg-panel)" : "transparent",
							boxShadow: on ? "var(--shadow-card)" : "none",
							color: on ? "var(--fg-1)" : "var(--fg-2)",
							font: `${on ? "500 " : "400 "}${size === "lg" ? "var(--text-md)" : "var(--text-sm)"}/1 var(--font-ui)`,
							cursor: "pointer",
						}}
					>
						{o.icon && <Icon name={o.icon} size={14} />}
						{o.label}
					</button>
				);
			})}
		</div>
	);
}
