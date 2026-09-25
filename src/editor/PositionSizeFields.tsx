// X/Y/W/H — общие для любого типа элемента (Base из docs/document-model.md).
// Общий кусок инспектора: ShapeInspector и TextInspector оба его используют.
import { PropertyRow } from "../ui/editor/PropertyRow";
import { TextField } from "../ui/forms/TextField";

export interface PositionSizeFieldsProps {
	x: number;
	y: number;
	w: number;
	h: number;
	onChange: (patch: { x?: number; y?: number; w?: number; h?: number }) => void;
}

export function PositionSizeFields({
	x,
	y,
	w,
	h,
	onChange,
}: PositionSizeFieldsProps) {
	const num = (v: string | number) => Number(v) || 0;

	return (
		<>
			<PropertyRow label="Позиция" columns={2}>
				<TextField
					value={x}
					unit="мм"
					onChange={(v) => onChange({ x: num(v) })}
				/>
				<TextField
					value={y}
					unit="мм"
					onChange={(v) => onChange({ y: num(v) })}
				/>
			</PropertyRow>
			<PropertyRow label="Размер" columns={2}>
				<TextField
					value={w}
					unit="мм"
					onChange={(v) => onChange({ w: num(v) })}
				/>
				<TextField
					value={h}
					unit="мм"
					onChange={(v) => onChange({ h: num(v) })}
				/>
			</PropertyRow>
		</>
	);
}
