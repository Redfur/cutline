// «Положение и размер» — общая секция для всех типов элементов. Замок живёт в шапке
// секции, а не только в слоях: заблокированный элемент гасит поля инспектора, и
// разблокировать его должно быть можно тут же, не уходя в список слоёв.
import type { CutlineElement } from "../../../model/document";
import { PanelSection } from "../../../ui/editor/PanelSection";
import { PropertyRow } from "../../../ui/editor/PropertyRow";
import { IconButton } from "../../../ui/forms/IconButton";
import { TextField } from "../../../ui/forms/TextField";
import { LockedFieldset } from "../LockedFieldset";
import { LineFields } from "./LineFields";

type Geometry = Pick<
	CutlineElement,
	"x" | "y" | "w" | "h" | "rotation" | "locked"
>;

export interface GeometrySectionProps {
	element: Geometry & { type: CutlineElement["type"] };
	onChange: (patch: Partial<Geometry>) => void;
	// высоту считает редактор (текст-строка — одна строка), поле только показывает её
	autoHeight?: boolean;
}

export function GeometrySection({
	element,
	onChange,
	autoHeight = false,
}: GeometrySectionProps) {
	const num = (v: string | number) => Number(v) || 0;
	const { locked } = element;
	return (
		<PanelSection
			title="Положение и размер"
			actions={
				<IconButton
					size="sm"
					icon={locked ? "lock" : "lock-open"}
					label={locked ? "Открепить" : "Закрепить"}
					active={locked}
					onClick={() => onChange({ locked: !locked })}
				/>
			}
		>
			<LockedFieldset locked={locked}>
				{element.type === "line" ? (
					<LineFields line={element} onChange={onChange} />
				) : (
					<>
						<PropertyRow columns={2}>
							<TextField
								prefix="X"
								value={element.x}
								unit="мм"
								onChange={(v) => onChange({ x: num(v) })}
							/>
							<TextField
								prefix="Y"
								value={element.y}
								unit="мм"
								onChange={(v) => onChange({ y: num(v) })}
							/>
						</PropertyRow>
						<PropertyRow columns={2}>
							<TextField
								prefix="Ш"
								value={element.w}
								unit="мм"
								onChange={(v) => onChange({ w: num(v) })}
							/>
							<TextField
								prefix="В"
								value={element.h}
								unit="мм"
								disabled={autoHeight}
								onChange={(v) => onChange({ h: num(v) })}
							/>
						</PropertyRow>
						{/* у линии поворота нет: её направление и так задаётся концами */}
						<PropertyRow columns={2}>
							<TextField
								prefixIcon="rotate-cw"
								value={element.rotation}
								unit="°"
								onChange={(v) => onChange({ rotation: num(v) })}
							/>
							<div />
						</PropertyRow>
					</>
				)}
			</LockedFieldset>
		</PanelSection>
	);
}
