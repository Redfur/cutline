// «Ничего не выделено» → свойства холста. Выделен rect/ellipse/line → ShapeInspector,
// text → TextInspector. Выделен image — этот тип ещё не добавляется через тулбар, но
// уже может прийти из открытого файла — честная заглушка вместо неверных полей.
import type {
	Canvas as CanvasModel,
	CutlineElement,
	Guide,
} from "../../model/document";
import { PanelSection } from "../../ui/editor/PanelSection";
import { PropertyRow } from "../../ui/editor/PropertyRow";
import { ColorField } from "../../ui/forms/ColorField";
import { Select } from "../../ui/forms/Select";
import { TextField } from "../../ui/forms/TextField";
import { GuideInspector } from "./GuideInspector";
import { ImageInspector } from "./ImageInspector";
import { ShapeInspector } from "./ShapeInspector";
import { TextInspector } from "./TextInspector";

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

function presetKeyFor(w: number, h: number): string {
	return PRESETS.find((p) => p.w === w && p.h === h)?.key ?? "custom";
}

export interface InspectorProps {
	canvas: CanvasModel;
	onCanvasChange: (canvas: CanvasModel) => void;
	selectedElement: CutlineElement | null;
	onElementChange: (element: CutlineElement) => void;
	selectedGuide: Guide | null;
	onGuideChange: (guide: Guide) => void;
}

function CanvasInspector({
	canvas,
	onChange,
}: {
	canvas: CanvasModel;
	onChange: (canvas: CanvasModel) => void;
}) {
	const presetKey = presetKeyFor(canvas.w, canvas.h);

	return (
		<PanelSection title="Холст">
			<PropertyRow label="Формат">
				<Select
					value={presetKey}
					options={[
						...PRESETS.map((p) => ({ value: p.key, label: p.label })),
						{ value: "custom", label: "Произвольный" },
					]}
					onChange={(key) => {
						const preset = PRESETS.find((p) => p.key === key);
						if (preset) {
							onChange({ ...canvas, w: preset.w, h: preset.h });
						}
					}}
				/>
			</PropertyRow>
			<PropertyRow label="Размер" columns={2}>
				<TextField
					value={canvas.w}
					unit="мм"
					onChange={(v) => onChange({ ...canvas, w: Number(v) || 0 })}
				/>
				<TextField
					value={canvas.h}
					unit="мм"
					onChange={(v) => onChange({ ...canvas, h: Number(v) || 0 })}
				/>
			</PropertyRow>
			<PropertyRow label="Вылет">
				<TextField
					value={canvas.bleed}
					unit="мм"
					onChange={(v) => onChange({ ...canvas, bleed: Number(v) || 0 })}
				/>
			</PropertyRow>
			<PropertyRow label="Безопасное поле">
				<TextField
					value={canvas.safe}
					unit="мм"
					onChange={(v) => onChange({ ...canvas, safe: Number(v) || 0 })}
				/>
			</PropertyRow>
			<PropertyRow label="Фон">
				{/* прозрачный фон (canvas.background: "transparent") пока не редактируется отсюда —
				    UI для этого отдельная маленькая задача, не блокирует остальные свойства холста */}
				<ColorField
					value={
						canvas.background === "transparent" ? "#FFFFFF" : canvas.background
					}
					showOpacity={false}
					onChange={(hex) => onChange({ ...canvas, background: hex })}
				/>
			</PropertyRow>
		</PanelSection>
	);
}

export function Inspector({
	canvas,
	onCanvasChange,
	selectedElement,
	onElementChange,
	selectedGuide,
	onGuideChange,
}: InspectorProps) {
	return (
		<div
			style={{
				width: "var(--inspector-w)",
				flex: "none",
				background: "var(--bg-panel)",
				borderLeft: "1px solid var(--border-1)",
				overflowY: "auto",
			}}
		>
			{selectedGuide && (
				<GuideInspector guide={selectedGuide} onChange={onGuideChange} />
			)}
			{!selectedGuide && !selectedElement && (
				<CanvasInspector canvas={canvas} onChange={onCanvasChange} />
			)}
			{!selectedGuide &&
				selectedElement &&
				(selectedElement.type === "rect" ||
					selectedElement.type === "ellipse" ||
					selectedElement.type === "line") && (
					<ShapeInspector
						element={selectedElement}
						onChange={onElementChange}
					/>
				)}
			{selectedElement && selectedElement.type === "text" && (
				<TextInspector
					key={selectedElement.id}
					element={selectedElement}
					onChange={onElementChange}
				/>
			)}
			{selectedElement && selectedElement.type === "image" && (
				<ImageInspector element={selectedElement} onChange={onElementChange} />
			)}
		</div>
	);
}
