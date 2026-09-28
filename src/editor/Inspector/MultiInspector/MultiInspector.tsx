// Несколько элементов: общая рамка группы. X/Y двигают всю группу, ширина и высота
// только показаны — масштабирования группы нет. Общие свойства (цвет, шрифт) —
// отдельный шаг, пока их правят по одному.
import type { CutlineElement } from "../../../model/document";
import { PanelSection } from "../../../ui/editor/PanelSection";
import { PropertyRow } from "../../../ui/editor/PropertyRow";
import { TextField } from "../../../ui/forms/TextField";
import { moveSelectionTo } from "../../lib/align";
import { cleanMm } from "../../lib/geometry";
import { selectionBounds } from "../../lib/selection";

export interface MultiInspectorProps {
	elements: CutlineElement[];
	ids: string[];
	onChange: (elements: CutlineElement[]) => void;
}

export function MultiInspector({
	elements,
	ids,
	onChange,
}: MultiInspectorProps) {
	const bounds = selectionBounds(elements.filter((el) => ids.includes(el.id)));
	if (!bounds) return null;
	const num = (v: string | number) => Number(v) || 0;
	return (
		<PanelSection title="Положение группы">
			<PropertyRow columns={2}>
				<TextField
					prefix="X"
					value={cleanMm(bounds.x)}
					unit="мм"
					onChange={(v) =>
						onChange(moveSelectionTo(elements, ids, num(v), bounds.y))
					}
				/>
				<TextField
					prefix="Y"
					value={cleanMm(bounds.y)}
					unit="мм"
					onChange={(v) =>
						onChange(moveSelectionTo(elements, ids, bounds.x, num(v)))
					}
				/>
			</PropertyRow>
			<PropertyRow columns={2}>
				<TextField prefix="Ш" value={cleanMm(bounds.w)} unit="мм" disabled />
				<TextField prefix="В" value={cleanMm(bounds.h)} unit="мм" disabled />
			</PropertyRow>
		</PanelSection>
	);
}
