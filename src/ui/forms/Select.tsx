import { type CSSProperties, useState } from "react";
import { Icon, type IconProps } from "../core/Icon";

export interface SelectOption {
	value: string;
	label: string;
}

export interface SelectProps {
	value?: string;
	onChange?: (value: string) => void;
	options: Array<SelectOption | string>;
	prefix?: string;
	prefixIcon?: IconProps["name"];
	width?: number | string;
	disabled?: boolean;
	warning?: boolean;
	style?: CSSProperties;
}

export function Select({
	value,
	onChange,
	options = [],
	prefix,
	prefixIcon,
	width,
	disabled,
	warning,
	style,
}: SelectProps) {
	const [f, setF] = useState(false);
	const opts = options.map((o) =>
		typeof o === "string" ? { value: o, label: o } : o,
	);
	return (
		<div
			style={{
				position: "relative",
				display: "flex",
				alignItems: "center",
				gap: 4,
				height: "var(--control-md)",
				width: width ?? "100%",
				minWidth: 0,
				padding: "0 6px 0 7px",
				background: disabled ? "var(--bg-subtle)" : "var(--bg-input)",
				border: `1px solid ${warning ? "var(--border-warning)" : f ? "var(--border-focus)" : "var(--border-1)"}`,
				borderRadius: "var(--radius-control)",
				boxShadow: f ? "var(--focus-ring)" : "none",
				...style,
			}}
		>
			{prefixIcon && (
				<span style={{ color: "var(--fg-3)" }}>
					<Icon name={prefixIcon} size={14} />
				</span>
			)}
			{prefix && (
				<span
					style={{
						font: "var(--type-label)",
						color: "var(--fg-3)",
						flex: "none",
					}}
				>
					{prefix}
				</span>
			)}
			<select
				value={value}
				disabled={disabled}
				onChange={(e) => onChange?.(e.target.value)}
				onFocus={() => setF(true)}
				onBlur={() => setF(false)}
				style={{
					flex: 1,
					minWidth: 0,
					appearance: "none",
					WebkitAppearance: "none",
					border: 0,
					outline: 0,
					background: "transparent",
					font: "var(--type-body)",
					color: disabled ? "var(--fg-disabled)" : "var(--fg-1)",
					paddingRight: 16,
					cursor: "pointer",
					textOverflow: "ellipsis",
				}}
			>
				{opts.map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
			</select>
			<span
				style={{
					position: "absolute",
					right: 6,
					pointerEvents: "none",
					color: "var(--fg-3)",
				}}
			>
				<Icon name="chevron-down" size={14} />
			</span>
		</div>
	);
}
