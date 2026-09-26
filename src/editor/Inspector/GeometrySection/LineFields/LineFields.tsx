// Геометрия линии — начало и конец, а не X/Y/W/H: у линии w/h — вектор и может быть
// отрицательным, «размер −20 мм» в инспекторе читался бы как ошибка. Правка одного
// конца оставляет другой на месте, как перетаскивание маркера на холсте.
import type { LineElement } from "../../../../model/document";
import { PropertyRow } from "../../../../ui/editor/PropertyRow";
import { TextField } from "../../../../ui/forms/TextField";

type LineGeometry = Pick<LineElement, "x" | "y" | "w" | "h">;

export interface LineFieldsProps {
	line: LineGeometry;
	onChange: (patch: LineGeometry) => void;
}

export function LineFields({ line, onChange }: LineFieldsProps) {
	const num = (v: string | number) => Number(v) || 0;
	const { x, y, w, h } = line;
	const x2 = x + w;
	const y2 = y + h;

	return (
		<>
			<PropertyRow label="Начало" columns={2}>
				<TextField
					value={x}
					unit="мм"
					onChange={(v) => onChange({ x: num(v), y, w: x2 - num(v), h })}
				/>
				<TextField
					value={y}
					unit="мм"
					onChange={(v) => onChange({ x, y: num(v), w, h: y2 - num(v) })}
				/>
			</PropertyRow>
			<PropertyRow label="Конец" columns={2}>
				<TextField
					value={x2}
					unit="мм"
					onChange={(v) => onChange({ x, y, w: num(v) - x, h })}
				/>
				<TextField
					value={y2}
					unit="мм"
					onChange={(v) => onChange({ x, y, w, h: num(v) - y })}
				/>
			</PropertyRow>
		</>
	);
}
