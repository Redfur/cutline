import type {
	ChangeEvent,
	CSSProperties,
	FocusEvent,
	KeyboardEvent,
	ReactNode,
	Ref,
} from "react";
import { useState } from "react";
import { Icon, type IconProps } from "../core/Icon";

// шаги стрелок вверх/вниз для числовых полей — как в Фигме
const ARROW_STEP = 1;
const ARROW_STEP_LARGE = 10; // Shift
const ARROW_STEP_SMALL = 0.1; // Alt/Option
// округляем результат — иначе повторные +0.1/-0.1 копят ошибку плавающей точки
const ARROW_STEP_PRECISION = 1000;

export interface TextFieldProps {
	value?: string | number;
	defaultValue?: string | number;
	onChange?: (
		value: string,
		e?: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => void;
	/** Short inline label inside the field: "X", "Ш", "Кегль" */
	prefix?: string;
	prefixIcon?: IconProps["name"];
	/** Unit suffix: "мм", "pt", "%" */
	unit?: ReactNode;
	placeholder?: string;
	multiline?: boolean;
	rows?: number;
	/** Mono font — for content with {{field}} tokens */
	mono?: boolean;
	align?: "left" | "right";
	invalid?: boolean;
	/** Amber border — value causes overflow */
	warning?: boolean;
	disabled?: boolean;
	width?: number | string;
	onFocus?: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
	onBlur?: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
	inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>;
	style?: CSSProperties;
}

export function TextField({
	value,
	defaultValue,
	onChange,
	prefix,
	prefixIcon,
	unit,
	placeholder,
	multiline,
	rows = 3,
	mono,
	align,
	invalid,
	warning,
	disabled,
	width,
	onFocus,
	onBlur,
	inputRef,
	style,
}: TextFieldProps) {
	const [f, setF] = useState(false);
	// Числовое поле отличаем по типу самого значения — это уже надёжный сигнал:
	// у нас в проекте числовые поля всегда получают number, текстовые — string,
	// заводить для этого отдельный проп незачем.
	const isNumeric = typeof value === "number";
	// Пока поле в фокусе, показываем то, что реально набрано (draft), а не value:
	// controlled-input на каждый onChange перерисовывается с новым value, и если
	// родитель нормализует "-", "-0", "4." через Number(v)||0 в число, реальный
	// набор строки (например смена знака на минус) стирался бы посреди печати.
	const [draft, setDraft] = useState<string | null>(null);
	const displayValue = isNumeric && draft !== null ? draft : value;
	const bd = invalid
		? "var(--border-danger)"
		: warning
			? "var(--border-warning)"
			: f
				? "var(--border-focus)"
				: "var(--border-1)";

	const fieldStyle: CSSProperties = {
		flex: 1,
		minWidth: 0,
		border: 0,
		outline: 0,
		background: "transparent",
		padding: 0,
		resize: multiline ? "vertical" : undefined,
		font: mono
			? "var(--weight-regular) var(--text-xs)/var(--lh-sm) var(--font-mono)"
			: "var(--type-body)",
		color: disabled ? "var(--fg-disabled)" : "var(--fg-1)",
		textAlign: align,
	};

	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: input/textarea вложены внутрь через тернарник ниже — Biome не видит контрол через условный рендер, семантика (label оборачивает поле) верна
		<label
			style={{
				display: "flex",
				alignItems: multiline ? "flex-start" : "center",
				gap: 4,
				minHeight: "var(--control-md)",
				height: multiline ? undefined : "var(--control-md)",
				width: width ?? "100%",
				minWidth: 0,
				padding: multiline ? "5px 7px" : "0 7px",
				background: disabled ? "var(--bg-subtle)" : "var(--bg-input)",
				border: `1px solid ${bd}`,
				borderRadius: "var(--radius-control)",
				boxShadow: f ? "var(--focus-ring)" : "none",
				transition: "border-color var(--duration-fast)",
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
						minWidth: 10,
					}}
				>
					{prefix}
				</span>
			)}
			{multiline ? (
				<textarea
					ref={inputRef as Ref<HTMLTextAreaElement>}
					value={value}
					defaultValue={defaultValue}
					placeholder={placeholder}
					disabled={disabled}
					rows={rows}
					onChange={(e) => onChange?.(e.target.value, e)}
					onFocus={(e) => {
						setF(true);
						onFocus?.(e);
					}}
					onBlur={(e) => {
						setF(false);
						onBlur?.(e);
					}}
					style={fieldStyle}
				/>
			) : (
				<input
					ref={inputRef as Ref<HTMLInputElement>}
					value={displayValue}
					defaultValue={defaultValue}
					placeholder={placeholder}
					disabled={disabled}
					onChange={(e) => {
						if (isNumeric) setDraft(e.target.value);
						onChange?.(e.target.value, e);
					}}
					onFocus={(e) => {
						setF(true);
						if (isNumeric) setDraft(String(value));
						onFocus?.(e);
					}}
					onBlur={(e) => {
						setF(false);
						setDraft(null);
						onBlur?.(e);
					}}
					onKeyDown={
						isNumeric
							? (e: KeyboardEvent<HTMLInputElement>) => {
									if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
									e.preventDefault();
									const step = e.shiftKey
										? ARROW_STEP_LARGE
										: e.altKey
											? ARROW_STEP_SMALL
											: ARROW_STEP;
									const current = Number(value) || 0;
									const delta = e.key === "ArrowUp" ? step : -step;
									const next =
										Math.round((current + delta) * ARROW_STEP_PRECISION) /
										ARROW_STEP_PRECISION;
									setDraft(String(next));
									onChange?.(String(next));
								}
							: undefined
					}
					style={fieldStyle}
				/>
			)}
			{unit && (
				<span
					style={{
						font: "var(--type-label)",
						color: "var(--fg-3)",
						flex: "none",
					}}
				>
					{unit}
				</span>
			)}
		</label>
	);
}
