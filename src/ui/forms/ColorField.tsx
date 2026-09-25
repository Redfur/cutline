import { type CSSProperties, useState } from "react";

export interface ColorFieldProps {
	/** #RRGGBB */
	value?: string;
	/** 0–100 */
	opacity?: number | string;
	onChange?: (hex: string) => void;
	onOpacityChange?: (v: string) => void;
	showOpacity?: boolean;
	/** Document colours shown as a row of 18px chips */
	swatches?: string[];
	style?: CSSProperties;
}

export function ColorField({
	value = "#000000",
	opacity = 100,
	onChange,
	onOpacityChange,
	showOpacity = true,
	swatches,
	style,
}: ColorFieldProps) {
	const [f, setF] = useState(false);
	return (
		<div style={{ display: "grid", gap: 6, ...style }}>
			<div style={{ display: "flex", gap: 6 }}>
				<label
					style={{
						flex: 1,
						display: "flex",
						alignItems: "center",
						gap: 6,
						height: "var(--control-md)",
						padding: "0 7px 0 4px",
						border: `1px solid ${f ? "var(--border-focus)" : "var(--border-1)"}`,
						boxShadow: f ? "var(--focus-ring)" : "none",
						borderRadius: "var(--radius-control)",
						background: "var(--bg-input)",
					}}
				>
					<span
						style={{
							position: "relative",
							width: 18,
							height: 18,
							borderRadius: "var(--radius-1)",
							background: value,
							boxShadow: "inset 0 0 0 1px rgba(0,0,0,.12)",
							flex: "none",
							overflow: "hidden",
						}}
					>
						<input
							type="color"
							value={value}
							onChange={(e) => onChange?.(e.target.value)}
							style={{
								position: "absolute",
								inset: 0,
								opacity: 0,
								cursor: "pointer",
							}}
						/>
					</span>
					<input
						value={value.replace("#", "").toUpperCase()}
						onFocus={() => setF(true)}
						onBlur={() => setF(false)}
						onChange={(e) => onChange?.(`#${e.target.value.replace("#", "")}`)}
						style={{
							flex: 1,
							minWidth: 0,
							border: 0,
							outline: 0,
							background: "transparent",
							font: "var(--type-mono)",
							color: "var(--fg-1)",
						}}
					/>
				</label>
				{showOpacity && (
					<label
						style={{
							width: 64,
							display: "flex",
							alignItems: "center",
							height: "var(--control-md)",
							padding: "0 7px",
							border: "1px solid var(--border-1)",
							borderRadius: "var(--radius-control)",
							background: "var(--bg-input)",
						}}
					>
						<input
							value={opacity}
							onChange={(e) => onOpacityChange?.(e.target.value)}
							style={{
								width: "100%",
								border: 0,
								outline: 0,
								background: "transparent",
								font: "var(--type-body)",
								textAlign: "right",
							}}
						/>
						<span
							style={{
								font: "var(--type-label)",
								color: "var(--fg-3)",
								marginLeft: 2,
							}}
						>
							%
						</span>
					</label>
				)}
			</div>
			{swatches && (
				<div style={{ display: "flex", gap: 4 }}>
					{swatches.map((s) => (
						<button
							key={s}
							type="button"
							title={s}
							onClick={() => onChange?.(s)}
							style={{
								width: 18,
								height: 18,
								padding: 0,
								border: 0,
								borderRadius: "var(--radius-1)",
								background: s,
								cursor: "pointer",
								boxShadow:
									s.toLowerCase() === value.toLowerCase()
										? "0 0 0 1px #fff, 0 0 0 2px var(--selection)"
										: "inset 0 0 0 1px rgba(0,0,0,.12)",
							}}
						/>
					))}
				</div>
			)}
		</div>
	);
}
