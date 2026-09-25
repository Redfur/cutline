// Пока в редакторе нельзя ничего выделить (нет ни выделения, ни элементов),
// инспектор всегда в состоянии «ничего не выделено» — показывает свойства холста.
// Состояние «выделен элемент» появится вместе с выделением, отдельным будущим шагом.
import type { Canvas as CanvasModel } from "../model/document";
import { PanelSection } from "../ui/editor/PanelSection";
import { PropertyRow } from "../ui/editor/PropertyRow";
import { ColorField } from "../ui/forms/ColorField";
import { Select } from "../ui/forms/Select";
import { TextField } from "../ui/forms/TextField";

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
	onChange: (canvas: CanvasModel) => void;
}

export function Inspector({ canvas, onChange }: InspectorProps) {
	const presetKey = presetKeyFor(canvas.w, canvas.h);

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
							canvas.background === "transparent"
								? "#FFFFFF"
								: canvas.background
						}
						showOpacity={false}
						onChange={(hex) => onChange({ ...canvas, background: hex })}
					/>
				</PropertyRow>
			</PanelSection>
		</div>
	);
}
