// Свойства холста — то, что инспектор показывает, когда ничего не выделено. Секции
// как в макете: Холст (формат, размер, ориентация) / Поля печати / Фон / Направляющие.
import type { Canvas as CanvasModel } from "../../../model/document";
import { PanelSection } from "../../../ui/editor/PanelSection";
import { PropertyRow } from "../../../ui/editor/PropertyRow";
import { ColorField } from "../../../ui/forms/ColorField";
import { SegmentedControl } from "../../../ui/forms/SegmentedControl";
import { Select } from "../../../ui/forms/Select";
import { TextField } from "../../../ui/forms/TextField";
import { HelpButton } from "../../HelpButton";
import type { BorderVisibility } from "../../lib/snap";
import { GuideToggle } from "./GuideToggle";

interface Preset {
	key: string;
	label: string;
	w: number;
	h: number;
}

const PRESETS: Preset[] = [
	{ key: "a6", label: "A6", w: 105, h: 148 },
	{ key: "a7", label: "A7", w: 74, h: 105 },
	{ key: "card", label: "Визитка", w: 90, h: 50 },
];

// формат не зависит от ориентации: A6 альбомом — всё ещё A6
function presetKeyFor(w: number, h: number): string {
	return (
		PRESETS.find((p) => (p.w === w && p.h === h) || (p.w === h && p.h === w))
			?.key ?? "custom"
	);
}

export interface CanvasInspectorProps {
	canvas: CanvasModel;
	onChange: (canvas: CanvasModel) => void;
	swatches: string[];
	borders: BorderVisibility;
	onBordersChange: (borders: BorderVisibility) => void;
}

export function CanvasInspector({
	canvas,
	onChange,
	swatches,
	borders,
	onBordersChange,
}: CanvasInspectorProps) {
	const num = (v: string | number) => Number(v) || 0;
	const landscape = canvas.w > canvas.h;

	return (
		<>
			<PanelSection title="Холст">
				<Select
					value={presetKeyFor(canvas.w, canvas.h)}
					options={[
						...PRESETS.map((p) => ({
							value: p.key,
							label: `${p.label} — ${p.w} × ${p.h} мм`,
						})),
						{ value: "custom", label: "Свой размер" },
					]}
					onChange={(key) => {
						const preset = PRESETS.find((p) => p.key === key);
						if (preset) onChange({ ...canvas, w: preset.w, h: preset.h });
					}}
				/>
				<PropertyRow columns={2}>
					<TextField
						prefix="Ш"
						value={canvas.w}
						unit="мм"
						onChange={(v) => onChange({ ...canvas, w: num(v) })}
					/>
					<TextField
						prefix="В"
						value={canvas.h}
						unit="мм"
						onChange={(v) => onChange({ ...canvas, h: num(v) })}
					/>
				</PropertyRow>
				<SegmentedControl
					fullWidth
					value={landscape ? "landscape" : "portrait"}
					onChange={(v) => {
						if ((v === "landscape") !== landscape) {
							onChange({ ...canvas, w: canvas.h, h: canvas.w });
						}
					}}
					options={[
						{ value: "portrait", label: "Книжная" },
						{ value: "landscape", label: "Альбомная" },
					]}
				/>
			</PanelSection>

			<PanelSection
				title="Поля печати"
				actions={<HelpButton topic="bleed-safe" />}
			>
				<PropertyRow label="Вылет">
					<TextField
						value={canvas.bleed}
						unit="мм"
						onChange={(v) => onChange({ ...canvas, bleed: num(v) })}
					/>
				</PropertyRow>
				<PropertyRow label="Безопасное">
					<TextField
						value={canvas.safe}
						unit="мм"
						onChange={(v) => onChange({ ...canvas, safe: num(v) })}
					/>
				</PropertyRow>
			</PanelSection>

			<PanelSection title="Фон">
				{/* прозрачный фон (canvas.background: "transparent") пока не редактируется отсюда —
				    UI для этого отдельная маленькая задача, не блокирует остальные свойства холста */}
				<ColorField
					value={
						canvas.background === "transparent" ? "#FFFFFF" : canvas.background
					}
					showOpacity={false}
					swatches={swatches}
					onChange={(hex) => onChange({ ...canvas, background: hex })}
				/>
			</PanelSection>

			<PanelSection
				title="Направляющие"
				actions={<HelpButton topic="guides" />}
			>
				<GuideToggle
					label="Линия обреза"
					kind="trim"
					checked={borders.trim}
					onChange={(trim) => onBordersChange({ ...borders, trim })}
				/>
				<GuideToggle
					label="Вылет"
					kind="bleed"
					checked={borders.bleed}
					onChange={(bleed) => onBordersChange({ ...borders, bleed })}
				/>
				<GuideToggle
					label="Безопасное поле"
					kind="safe"
					checked={borders.safe}
					onChange={(safe) => onBordersChange({ ...borders, safe })}
				/>
			</PanelSection>
		</>
	);
}
