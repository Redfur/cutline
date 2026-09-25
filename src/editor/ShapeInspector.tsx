// Свойства rect/ellipse/line — общий набор: позиция/размер, заливка (кроме line),
// обводка, у прямоугольника ещё радиус скругления. text/image — отдельный будущий срез.
import type {
	EllipseElement,
	LineElement,
	RectElement,
} from "../model/document";
import { PanelSection } from "../ui/editor/PanelSection";
import { PropertyRow } from "../ui/editor/PropertyRow";
import { Checkbox } from "../ui/forms/Checkbox";
import { ColorField } from "../ui/forms/ColorField";
import { TextField } from "../ui/forms/TextField";

type ShapeElement = RectElement | EllipseElement | LineElement;

export interface ShapeInspectorProps {
	element: ShapeElement;
	onChange: (element: ShapeElement) => void;
}

const DEFAULT_STROKE_WIDTH = 0.5;

export function ShapeInspector({ element, onChange }: ShapeInspectorProps) {
	const num = (v: string | number) => Number(v) || 0;

	return (
		<PanelSection title={element.name}>
			<PropertyRow label="Позиция" columns={2}>
				<TextField
					value={element.x}
					unit="мм"
					onChange={(v) => onChange({ ...element, x: num(v) })}
				/>
				<TextField
					value={element.y}
					unit="мм"
					onChange={(v) => onChange({ ...element, y: num(v) })}
				/>
			</PropertyRow>
			<PropertyRow label="Размер" columns={2}>
				<TextField
					value={element.w}
					unit="мм"
					onChange={(v) => onChange({ ...element, w: num(v) })}
				/>
				<TextField
					value={element.h}
					unit="мм"
					onChange={(v) => onChange({ ...element, h: num(v) })}
				/>
			</PropertyRow>

			{element.type !== "line" && (
				<PropertyRow label="Заливка">
					<Checkbox
						checked={element.fill !== null}
						onChange={(checked) =>
							onChange({ ...element, fill: checked ? "#CCCCCC" : null })
						}
					/>
					{element.fill !== null && (
						<ColorField
							value={element.fill}
							showOpacity={false}
							onChange={(hex) => onChange({ ...element, fill: hex })}
						/>
					)}
				</PropertyRow>
			)}

			<PropertyRow label="Обводка">
				<Checkbox
					checked={element.stroke !== null}
					onChange={(checked) =>
						onChange({
							...element,
							stroke: checked ? "#111111" : null,
							strokeWidth: checked
								? element.strokeWidth || DEFAULT_STROKE_WIDTH
								: element.strokeWidth,
						})
					}
				/>
				{element.stroke !== null && (
					<ColorField
						value={element.stroke}
						showOpacity={false}
						onChange={(hex) => onChange({ ...element, stroke: hex })}
					/>
				)}
			</PropertyRow>
			{element.stroke !== null && (
				<PropertyRow label="Толщина">
					<TextField
						value={element.strokeWidth}
						unit="мм"
						onChange={(v) => onChange({ ...element, strokeWidth: num(v) })}
					/>
				</PropertyRow>
			)}

			{element.type === "rect" && (
				<PropertyRow label="Радиус">
					<TextField
						value={element.radius}
						unit="мм"
						onChange={(v) => onChange({ ...element, radius: num(v) })}
					/>
				</PropertyRow>
			)}
		</PanelSection>
	);
}
