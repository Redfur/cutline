// Свойства выделенной направляющей — единственное осмысленное свойство это её позиция
// по своей оси; сама направляющая уже создаётся/двигается/удаляется перетаскиванием
// с линейки (Canvas.tsx), это точечный числовой ввод в дополнение к нему.
import type { Guide } from "../../../model/document";
import { PanelSection } from "../../../ui/editor/PanelSection";
import { PropertyRow } from "../../../ui/editor/PropertyRow";
import { TextField } from "../../../ui/forms/TextField";

export interface GuideInspectorProps {
	guide: Guide;
	onChange: (guide: Guide) => void;
}

export function GuideInspector({ guide, onChange }: GuideInspectorProps) {
	return (
		<PanelSection
			title={guide.axis === "x" ? "Направляющая по X" : "Направляющая по Y"}
		>
			<PropertyRow label="Позиция">
				<TextField
					value={guide.positionMm}
					unit="мм"
					onChange={(v) => onChange({ ...guide, positionMm: Number(v) || 0 })}
				/>
			</PropertyRow>
		</PanelSection>
	);
}
