// Свойства text — по группам из docs/ui-spec.md (Содержимое/Положение/Шрифт/
// Выравнивание/Цвет/Автоподгонка). Вставка плейсхолдера по списку полей — когда
// появятся doc.fields (Этап 3), пока {{key}} печатается в контенте вручную.
import { useState } from "react";
import type {
	TextAlign,
	TextElement,
	TextFit,
	TextValign,
} from "../../model/document";
import { PanelSection } from "../../ui/editor/PanelSection";
import { PropertyRow } from "../../ui/editor/PropertyRow";
import { ColorField } from "../../ui/forms/ColorField";
import { IconButton } from "../../ui/forms/IconButton";
import { SegmentedControl } from "../../ui/forms/SegmentedControl";
import { Select } from "../../ui/forms/Select";
import { TextField } from "../../ui/forms/TextField";
import { PositionSizeFields } from "./PositionSizeFields";

export interface TextInspectorProps {
	element: TextElement;
	onChange: (element: TextElement) => void;
}

const ALIGN_OPTIONS: {
	value: TextAlign;
	icon: "align-left" | "align-center" | "align-right";
	label: string;
}[] = [
	{ value: "left", icon: "align-left", label: "По левому краю" },
	{ value: "center", icon: "align-center", label: "По центру" },
	{ value: "right", icon: "align-right", label: "По правому краю" },
];

const VALIGN_OPTIONS: { value: TextValign; label: string }[] = [
	{ value: "top", label: "По верху" },
	{ value: "middle", label: "По центру" },
	{ value: "baseline", label: "По базовой линии" },
];

const FIT_OPTIONS: { value: TextFit; label: string }[] = [
	{ value: "shrink", label: "Сжимать" },
	{ value: "clip", label: "Обрезать" },
	{ value: "wrap", label: "Переносить" },
	{ value: "none", label: "Не трогать" },
];

// Классические кросс-платформенные системные шрифты (Windows/macOS/Linux через
// Arimo/Liberation-замены) — не веб-шрифты редактора (Golos Text и т.п. загружены
// только для интерфейса и их не будет на машине, где откроют экспортированный SVG).
const FONT_PRESETS = [
	"Arial",
	"Georgia",
	"Times New Roman",
	"Verdana",
	"Courier New",
	"Trebuchet MS",
];
const CUSTOM_FONT = "custom";

export function TextInspector({ element, onChange }: TextInspectorProps) {
	const num = (v: string | number) => Number(v) || 0;
	// Выбор «Свой…», когда font и так уже совпадает с одним из пресетов (частый
	// случай — просто передумали и хотят вписать другое имя), иначе не переключил бы
	// ничего: производное displayValue тут же снова показало бы этот же пресет.
	// Инспектор перемонтируется на смену элемента (key={element.id} в Inspector.tsx),
	// так что это состояние не «утечёт» на другой текстовый элемент.
	const [forceCustom, setForceCustom] = useState(
		() => !FONT_PRESETS.includes(element.font),
	);
	const showCustomFontField =
		forceCustom || !FONT_PRESETS.includes(element.font);

	return (
		<PanelSection title={element.name}>
			<PropertyRow label="Содержимое">
				<TextField
					mono
					value={element.content}
					onChange={(v) => onChange({ ...element, content: v })}
				/>
			</PropertyRow>

			<PositionSizeFields
				x={element.x}
				y={element.y}
				w={element.w}
				h={element.h}
				onChange={(patch) => onChange({ ...element, ...patch })}
			/>

			<PropertyRow label="Шрифт">
				<Select
					value={showCustomFontField ? CUSTOM_FONT : element.font}
					options={[
						...FONT_PRESETS.map((f) => ({ value: f, label: f })),
						{ value: CUSTOM_FONT, label: "Свой…" },
					]}
					onChange={(v) => {
						if (v === CUSTOM_FONT) {
							setForceCustom(true);
						} else {
							setForceCustom(false);
							onChange({ ...element, font: v });
						}
					}}
				/>
			</PropertyRow>
			{showCustomFontField && (
				<PropertyRow>
					<TextField
						value={element.font}
						placeholder="Название шрифта"
						onChange={(v) => onChange({ ...element, font: v })}
					/>
				</PropertyRow>
			)}
			<PropertyRow label="Начертание">
				<SegmentedControl
					value={element.weight}
					onChange={(v) =>
						onChange({ ...element, weight: v as TextElement["weight"] })
					}
					options={[
						{ value: "regular", label: "Обычное" },
						{ value: "bold", label: "Жирное" },
					]}
				/>
			</PropertyRow>
			<PropertyRow label="Кегль" columns={2}>
				<TextField
					value={element.size}
					unit="мм"
					onChange={(v) => onChange({ ...element, size: num(v) })}
				/>
				<TextField
					value={element.tracking}
					unit="мм"
					onChange={(v) => onChange({ ...element, tracking: num(v) })}
				/>
			</PropertyRow>
			{/* Множитель кегля (render.ts: lineHeightMm = sizeMm * lineHeight), а не мм —
			    поэтому эффект виден только когда строк больше одной (перенос/ручные \n):
			    позиция единственной строки от lineHeight не зависит. При автоподгонке
			    shrink интервал пересчитывается от уже уменьшенного кегля, не от исходного —
			    строки не могут наехать друг на друга из-за фиксированного интервала. */}
			<PropertyRow label="Межстрочный">
				<TextField
					value={element.lineHeight}
					onChange={(v) => onChange({ ...element, lineHeight: num(v) })}
				/>
			</PropertyRow>

			<PropertyRow label="Выравнивание">
				{ALIGN_OPTIONS.map(({ value, icon, label }) => (
					<IconButton
						key={value}
						icon={icon}
						label={label}
						active={element.align === value}
						onClick={() => onChange({ ...element, align: value })}
					/>
				))}
			</PropertyRow>
			<PropertyRow>
				<Select
					value={element.valign}
					onChange={(v) => onChange({ ...element, valign: v as TextValign })}
					options={VALIGN_OPTIONS}
				/>
			</PropertyRow>

			<PropertyRow label="Цвет">
				<ColorField
					value={element.color}
					showOpacity={false}
					onChange={(hex) => onChange({ ...element, color: hex })}
				/>
			</PropertyRow>

			<PropertyRow label="Автоподгонка">
				<Select
					value={element.fit}
					onChange={(v) => onChange({ ...element, fit: v as TextFit })}
					options={FIT_OPTIONS}
				/>
			</PropertyRow>
			{element.fit === "shrink" && (
				<PropertyRow label="Мин. кегль">
					<TextField
						value={element.minSize}
						unit="мм"
						onChange={(v) => onChange({ ...element, minSize: num(v) })}
					/>
				</PropertyRow>
			)}
		</PanelSection>
	);
}
