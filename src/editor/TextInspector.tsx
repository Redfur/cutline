// Свойства text — по группам из docs/ui-spec.md (Содержимое/Положение/Шрифт/
// Выравнивание/Цвет/Автоподгонка). Вставка плейсхолдера по списку полей — когда
// появятся doc.fields (Этап 3), пока {{key}} печатается в контенте вручную.
import type {
	TextAlign,
	TextElement,
	TextFit,
	TextValign,
} from "../model/document";
import { PanelSection } from "../ui/editor/PanelSection";
import { PropertyRow } from "../ui/editor/PropertyRow";
import { ColorField } from "../ui/forms/ColorField";
import { IconButton } from "../ui/forms/IconButton";
import { SegmentedControl } from "../ui/forms/SegmentedControl";
import { Select } from "../ui/forms/Select";
import { TextField } from "../ui/forms/TextField";
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

export function TextInspector({ element, onChange }: TextInspectorProps) {
	const num = (v: string | number) => Number(v) || 0;

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
				<TextField
					value={element.font}
					onChange={(v) => onChange({ ...element, font: v })}
				/>
			</PropertyRow>
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
