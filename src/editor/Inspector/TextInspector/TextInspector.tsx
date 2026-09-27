// Свойства text — секциями, как в макете дизайн-системы (ui_kits/editor/Inspector.jsx):
// Содержимое / Положение и размер / Шрифт и кегль / Выравнивание / Цвет / Автоподгонка.
// Кегль в pt, межстрочный и трекинг в % — только при показе, модель в мм (lib/units.ts).
import { useRef, useState } from "react";
import {
	BUNDLED_FAMILIES,
	familyWeights,
	isBundledFont,
	resolveWeight,
	WEIGHT_LABELS,
} from "../../../fonts/bundled";
import type {
	DataRecord,
	FieldDef,
	TextAlign,
	TextElement,
	TextFit,
	TextValign,
} from "../../../model/document";
import { PanelSection } from "../../../ui/editor/PanelSection";
import { PropertyRow } from "../../../ui/editor/PropertyRow";
import { Button } from "../../../ui/forms/Button";
import { ColorField } from "../../../ui/forms/ColorField";
import { SegmentedControl } from "../../../ui/forms/SegmentedControl";
import { Select } from "../../../ui/forms/Select";
import { TextField } from "../../../ui/forms/TextField";
import {
	lineHeightToPct,
	mmToPt,
	pctToLineHeight,
	pctToTracking,
	ptToMm,
	trackingToPct,
} from "../../lib/units";
import { ElementErrors, type RecordError } from "../ElementErrors";
import { FieldMenu } from "../FieldMenu";
import { GeometrySection } from "../GeometrySection";
import { LockedFieldset } from "../LockedFieldset";
import { MissingFields } from "../MissingFields";
import { OverflowAlert } from "../OverflowAlert";
import styles from "./TextInspector.module.css";

export interface TextInspectorProps {
	element: TextElement;
	onChange: (element: TextElement) => void;
	fields: FieldDef[];
	// текущая запись предпросмотра — для подсказок в «Вставить поле»
	record: DataRecord;
	// номера записей (с 1), где этот текст не влезает в рамку
	overflowRecords: number[];
	swatches: string[];
	// ошибки функций в content по записям
	recordErrors: RecordError[];
}

// дальше перечислять бессмысленно — полный список даёт фильтр в «Данных»
const OVERFLOW_LIST_LIMIT = 5;

function overflowText(records: number[]): string {
	if (records.length === 0) return "";
	const shown = records.slice(0, OVERFLOW_LIST_LIMIT).join(", ");
	const rest = records.length - OVERFLOW_LIST_LIMIT;
	const which = records.length === 1 ? "Запись" : "Записи";
	return rest > 0 ? `${which} ${shown} и ещё ${rest}.` : `${which} ${shown}.`;
}

const ALIGN_OPTIONS: {
	value: TextAlign;
	icon: "align-left" | "align-center" | "align-right";
	title: string;
}[] = [
	{ value: "left", icon: "align-left", title: "По левому краю" },
	{ value: "center", icon: "align-center", title: "По центру" },
	{ value: "right", icon: "align-right", title: "По правому краю" },
];

const VALIGN_OPTIONS: {
	value: TextValign;
	icon:
		| "align-start-horizontal"
		| "align-center-horizontal"
		| "align-end-horizontal";
	title: string;
}[] = [
	{ value: "top", icon: "align-start-horizontal", title: "По верху" },
	{ value: "middle", icon: "align-center-horizontal", title: "По середине" },
	// базовая линия последней строки на нижнем крае рамки (модель v2)
	{
		value: "baseline",
		icon: "align-end-horizontal",
		title: "По базовой линии",
	},
];

const FIT_OPTIONS: { value: TextFit; label: string }[] = [
	{ value: "none", label: "Не менять — предупредить" },
	{ value: "shrink", label: "Уменьшать кегль" },
	{ value: "clip", label: "Обрезать с многоточием" },
	{ value: "wrap", label: "Переносить строки" },
];

function fitHint(el: TextElement): string {
	switch (el.fit) {
		case "shrink":
			return `Кегль уменьшится до ${mmToPt(el.minSize)} pt, дальше — многоточие.`;
		case "clip":
			return "Лишний текст скроется, в тираже будет «…».";
		case "wrap":
			return "Строки переносятся по словам в пределах рамки.";
		case "none":
			return "Длинный текст выйдет за рамку и попадёт в список проблем.";
	}
}

// Встроенные — первыми: только они попадают в PDF (src/fonts/bundled.ts). Системные
// остаются для экрана и SVG — классические кросс-платформенные (Windows/macOS/Linux
// через Arimo/Liberation-замены), с пометкой, чтобы PDF-ошибка не была сюрпризом.
const SYSTEM_FONTS = [
	"Arial",
	"Georgia",
	"Times New Roman",
	"Verdana",
	"Courier New",
	"Trebuchet MS",
];
const FONT_PRESETS = [...BUNDLED_FAMILIES, ...SYSTEM_FONTS];

function fontLabel(family: string): string {
	return isBundledFont(family) ? family : `${family} — не для PDF`;
}
const CUSTOM_FONT = "custom";

export function TextInspector({
	element,
	onChange,
	fields,
	record,
	overflowRecords,
	recordErrors,
	swatches,
}: TextInspectorProps) {
	const num = (v: string | number) => Number(v) || 0;
	const set = (patch: Partial<TextElement>) =>
		onChange({ ...element, ...patch });
	const contentRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
	const over = overflowRecords.length > 0;
	// Поле для имени шрифта — только по явному «Свой…». Шрифт не из пресетов (из
	// открытого файла) стоит в списке отдельным пунктом:
	// в селекте видно, какой шрифт на самом деле, а не безликое «Свой…».
	// Инспектор перемонтируется на смену элемента (key={element.id} в Inspector.tsx),
	// так что это состояние не «утечёт» на другой текстовый элемент.
	const [showCustomFontField, setShowCustomFontField] = useState(false);
	const fontOptions =
		FONT_PRESETS.includes(element.font) || !element.font
			? FONT_PRESETS
			: [element.font, ...FONT_PRESETS];
	const weights = familyWeights(element.font);
	// У PT Serif нет Medium/SemiBold: при смене семейства вес сразу становится тем,
	// которым текст и наберётся, — одним шагом истории с самим семейством
	const withFont = (font: string): Partial<TextElement> => ({
		font,
		weight: resolveWeight(familyWeights(font), element.weight),
	});

	// в позицию курсора, а не в конец: «Здравствуйте, {{name}}!» собирают вставкой в середину
	const insertField = (token: string) => {
		const input = contentRef.current;
		const from = input?.selectionStart ?? element.content.length;
		const to = input?.selectionEnd ?? from;
		set({
			content:
				element.content.slice(0, from) + token + element.content.slice(to),
		});
	};

	return (
		<>
			{over && (
				<OverflowAlert
					title="Текст не влезает в рамку"
					actions={
						<>
							{/* при shrink кнопка не нужна — там помогает только меньший мин. кегль или шире рамка */}
							{element.fit !== "shrink" && (
								<Button
									size="sm"
									variant="warning"
									icon="shrink"
									disabled={element.locked}
									onClick={() => set({ fit: "shrink" })}
								>
									Уменьшать кегль
								</Button>
							)}
							{/* по строке за клик: сколько не хватает, зависит от записи */}
							<Button
								size="sm"
								variant="ghost"
								disabled={element.locked}
								onClick={() =>
									set({ h: element.h + element.size * element.lineHeight })
								}
							>
								Увеличить рамку
							</Button>
						</>
					}
				>
					{overflowText(overflowRecords)}
				</OverflowAlert>
			)}

			<LockedFieldset locked={element.locked}>
				<PanelSection
					title="Содержимое"
					actions={
						<FieldMenu
							fields={fields}
							record={record}
							target="text"
							onInsert={insertField}
						/>
					}
				>
					<TextField
						multiline
						mono
						rows={3}
						inputRef={contentRef}
						value={element.content}
						warning={over}
						onChange={(v) => set({ content: v })}
					/>
					<MissingFields template={element.content} fields={fields} />
					<ElementErrors
						template={element.content}
						kind="text"
						recordErrors={recordErrors}
					/>
				</PanelSection>
			</LockedFieldset>

			<GeometrySection element={element} onChange={set} />

			<LockedFieldset locked={element.locked}>
				<PanelSection title="Шрифт и кегль">
					<Select
						value={showCustomFontField ? CUSTOM_FONT : element.font}
						options={[
							...fontOptions.map((f) => ({ value: f, label: fontLabel(f) })),
							{ value: CUSTOM_FONT, label: "Свой…" },
						]}
						onChange={(v) => {
							setShowCustomFontField(v === CUSTOM_FONT);
							if (v !== CUSTOM_FONT) set(withFont(v));
						}}
					/>
					{showCustomFontField && (
						<TextField
							value={element.font}
							placeholder="Название шрифта"
							onChange={(v) => set(withFont(v))}
						/>
					)}
					<PropertyRow columns={2}>
						<Select
							value={String(resolveWeight(weights, element.weight))}
							onChange={(v) => {
								const weight = weights.find((w) => String(w) === v);
								if (weight) set({ weight });
							}}
							options={weights.map((w) => ({
								value: String(w),
								label: WEIGHT_LABELS[w],
							}))}
						/>
						<TextField
							prefixIcon="a-large-small"
							value={mmToPt(element.size)}
							unit="pt"
							warning={over}
							onChange={(v) => {
								const size = ptToMm(num(v));
								// трекинг в инспекторе — процент от кегля; держим процент,
								// иначе при увеличении кегля буквы «слипались» бы
								const pct = trackingToPct(element.tracking, element.size);
								set({ size, tracking: pctToTracking(pct, size) });
							}}
						/>
					</PropertyRow>
					{/* Межстрочный — множитель кегля (render.ts: lineHeightMm = sizeMm * lineHeight),
					    поэтому эффект виден только когда строк больше одной (перенос/ручные \n). */}
					<PropertyRow columns={2}>
						<TextField
							prefixIcon="move-vertical"
							value={lineHeightToPct(element.lineHeight)}
							unit="%"
							onChange={(v) => set({ lineHeight: pctToLineHeight(num(v)) })}
						/>
						<TextField
							prefixIcon="move-horizontal"
							value={trackingToPct(element.tracking, element.size)}
							unit="%"
							onChange={(v) =>
								set({ tracking: pctToTracking(num(v), element.size) })
							}
						/>
					</PropertyRow>
				</PanelSection>

				<PanelSection title="Выравнивание">
					<PropertyRow columns={2}>
						<SegmentedControl
							fullWidth
							value={element.align}
							onChange={(v) => set({ align: v as TextAlign })}
							options={ALIGN_OPTIONS}
						/>
						<SegmentedControl
							fullWidth
							value={element.valign}
							onChange={(v) => set({ valign: v as TextValign })}
							options={VALIGN_OPTIONS}
						/>
					</PropertyRow>
				</PanelSection>

				<PanelSection title="Цвет">
					<ColorField
						value={element.color}
						showOpacity={false}
						swatches={swatches}
						onChange={(hex) => set({ color: hex })}
					/>
				</PanelSection>

				<PanelSection title="Автоподгонка" warning={over}>
					<Select
						value={element.fit}
						warning={over}
						onChange={(v) => set({ fit: v as TextFit })}
						options={FIT_OPTIONS}
					/>
					{element.fit === "shrink" && (
						<PropertyRow label="Не меньше">
							<TextField
								value={mmToPt(element.minSize)}
								unit="pt"
								onChange={(v) => set({ minSize: ptToMm(num(v)) })}
							/>
						</PropertyRow>
					)}
					<div className={styles.hint}>{fitHint(element)}</div>
				</PanelSection>
			</LockedFieldset>
		</>
	);
}
