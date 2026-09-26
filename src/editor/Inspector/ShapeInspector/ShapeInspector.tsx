// Свойства rect/ellipse/line — общий набор: позиция/размер, заливка (кроме line),
// обводка, у прямоугольника ещё радиус скругления. text/image — отдельный будущий срез.
import type {
	EllipseElement,
	LineElement,
	RectElement,
} from "../../../model/document";
import { PanelSection } from "../../../ui/editor/PanelSection";
import { PropertyRow } from "../../../ui/editor/PropertyRow";
import { Checkbox } from "../../../ui/forms/Checkbox";
import { ColorField } from "../../../ui/forms/ColorField";
import { TextField } from "../../../ui/forms/TextField";
import { PositionSizeFields } from "../PositionSizeFields";

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
			<PositionSizeFields
				x={element.x}
				y={element.y}
				w={element.w}
				h={element.h}
				onChange={(patch) => onChange({ ...element, ...patch })}
			/>

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
