import type { CSSProperties, ReactNode } from "react";
import { Icon } from "../core/Icon";

export interface CheckboxProps {
	checked?: boolean;
	indeterminate?: boolean;
	onChange?: (checked: boolean) => void;
	label?: ReactNode;
	disabled?: boolean;
	style?: CSSProperties;
}

export function Checkbox({
	checked,
	onChange,
	label,
	disabled,
	indeterminate,
	style,
}: CheckboxProps) {
	const on = checked || indeterminate;
	return (
		<label
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 6,
				minHeight: 22,
				cursor: disabled ? "default" : "pointer",
				color: disabled ? "var(--fg-disabled)" : "var(--fg-1)",
				font: "var(--type-body)",
				...style,
			}}
		>
			<input
				type="checkbox"
				checked={!!checked}
				disabled={disabled}
				onChange={(e) => onChange?.(e.target.checked)}
				style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
			/>
			<span
				style={{
					width: 14,
					height: 14,
					flex: "none",
					borderRadius: "var(--radius-1)",
					border: `1px solid ${on ? "var(--bg-accent)" : "var(--border-strong)"}`,
					background: disabled
						? "var(--bg-subtle)"
						: on
							? "var(--bg-accent)"
							: "var(--bg-input)",
					color: "#fff",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{checked && !indeterminate && (
					<Icon name="check" size={12} strokeWidth={2.4} />
				)}
				{indeterminate && <Icon name="minus" size={12} strokeWidth={2.4} />}
			</span>
			{label}
		</label>
	);
}
