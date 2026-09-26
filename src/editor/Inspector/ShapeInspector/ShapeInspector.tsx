// Свойства rect/ellipse/line — секциями, как в макете: положение и размер, заливка
// (кроме линии), обводка, у прямоугольника ещё скругление. Заливку и обводку
// включает галочка в шапке секции: «нет заливки» — тоже значение, а не пустой цвет.
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
import { GeometrySection } from "../GeometrySection";
import { LockedFieldset } from "../LockedFieldset";

type ShapeElement = RectElement | EllipseElement | LineElement;

export interface ShapeInspectorProps {
	element: ShapeElement;
	onChange: (element: ShapeElement) => void;
	swatches: string[];
}

const DEFAULT_FILL = "#CCCCCC";
const DEFAULT_STROKE = "#111111";
const DEFAULT_STROKE_WIDTH = 0.5;

export function ShapeInspector({
	element,
	onChange,
	swatches,
}: ShapeInspectorProps) {
	const num = (v: string | number) => Number(v) || 0;

	return (
		<>
			<GeometrySection
				element={element}
				onChange={(patch) => onChange({ ...element, ...patch })}
			/>

			<LockedFieldset locked={element.locked}>
				{element.type !== "line" && (
					<PanelSection
						title="Заливка"
						actions={
							<Checkbox
								checked={element.fill !== null}
								onChange={(checked) =>
									onChange({ ...element, fill: checked ? DEFAULT_FILL : null })
								}
							/>
						}
					>
						{element.fill !== null && (
							<ColorField
								value={element.fill}
								showOpacity={false}
								swatches={swatches}
								onChange={(hex) => onChange({ ...element, fill: hex })}
							/>
						)}
					</PanelSection>
				)}

				<PanelSection
					title="Обводка"
					actions={
						<Checkbox
							checked={element.stroke !== null}
							onChange={(checked) =>
								onChange({
									...element,
									stroke: checked ? DEFAULT_STROKE : null,
									strokeWidth: checked
										? element.strokeWidth || DEFAULT_STROKE_WIDTH
										: element.strokeWidth,
								})
							}
						/>
					}
				>
					{element.stroke !== null && (
						<>
							<ColorField
								value={element.stroke}
								showOpacity={false}
								swatches={swatches}
								onChange={(hex) => onChange({ ...element, stroke: hex })}
							/>
							<PropertyRow label="Толщина">
								<TextField
									value={element.strokeWidth}
									unit="мм"
									onChange={(v) =>
										onChange({ ...element, strokeWidth: num(v) })
									}
								/>
							</PropertyRow>
						</>
					)}
				</PanelSection>

				{element.type === "rect" && (
					<PanelSection title="Скругление">
						<PropertyRow label="Радиус">
							<TextField
								value={element.radius}
								unit="мм"
								onChange={(v) => onChange({ ...element, radius: num(v) })}
							/>
						</PropertyRow>
					</PanelSection>
				)}
			</LockedFieldset>
		</>
	);
}
