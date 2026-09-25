import type { CSSProperties, ReactNode } from "react";

export interface SwitchProps {
	checked?: boolean;
	onChange?: (checked: boolean) => void;
	label?: ReactNode;
	disabled?: boolean;
	style?: CSSProperties;
}

export function Switch({
	checked,
	onChange,
	label,
	disabled,
	style,
}: SwitchProps) {
	return (
		<label
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 8,
				cursor: disabled ? "default" : "pointer",
				font: "var(--type-body)",
				color: disabled ? "var(--fg-disabled)" : "var(--fg-1)",
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
					width: 26,
					height: 14,
					borderRadius: 7,
					background: checked ? "var(--bg-accent)" : "var(--gray-300)",
					position: "relative",
					flex: "none",
					transition: "background var(--duration-base) var(--ease-out)",
					opacity: disabled ? 0.5 : 1,
				}}
			>
				<span
					style={{
						position: "absolute",
						top: 2,
						left: checked ? 14 : 2,
						width: 10,
						height: 10,
						borderRadius: 5,
						background: "#fff",
						transition: "left var(--duration-base) var(--ease-out)",
					}}
				/>
			</span>
			{label}
		</label>
	);
}
