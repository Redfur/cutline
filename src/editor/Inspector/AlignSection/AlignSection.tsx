// Выравнивание: у группы — по её общей рамке, у одного элемента — по карточке
// (alignTarget). Распределение — только у группы от трёх элементов.
import type { CutlineElement } from "../../../model/document";
import type { IconProps } from "../../../ui/core/Icon";
import { PanelSection } from "../../../ui/editor/PanelSection";
import { IconButton } from "../../../ui/forms/IconButton";
import { HelpButton } from "../../HelpButton";
import {
	type AlignEdge,
	type Axis,
	alignElements,
	alignTarget,
	distributeElements,
} from "../../lib/align";
import type { Bounds } from "../../lib/geometry";
import styles from "./AlignSection.module.css";

const ALIGN_BUTTONS: {
	edge: AlignEdge;
	icon: IconProps["name"];
	label: string;
}[] = [
	{ edge: "left", icon: "align-start-vertical", label: "По левому краю" },
	{ edge: "centerX", icon: "align-center-vertical", label: "По центру" },
	{ edge: "right", icon: "align-end-vertical", label: "По правому краю" },
	{ edge: "top", icon: "align-start-horizontal", label: "По верху" },
	{ edge: "centerY", icon: "align-center-horizontal", label: "По середине" },
	{ edge: "bottom", icon: "align-end-horizontal", label: "По низу" },
];

const DISTRIBUTE_BUTTONS: {
	axis: Axis;
	icon: IconProps["name"];
	label: string;
}[] = [
	{
		axis: "x",
		icon: "align-horizontal-distribute-center",
		label: "Распределить по горизонтали",
	},
	{
		axis: "y",
		icon: "align-vertical-distribute-center",
		label: "Распределить по вертикали",
	},
];

export interface AlignSectionProps {
	// все элементы документа — правка возвращает их целиком, одним шагом истории
	elements: CutlineElement[];
	ids: string[];
	// карточка в мм — цель выравнивания одного элемента
	card: Bounds;
	onChange: (elements: CutlineElement[]) => void;
}

export function AlignSection({
	elements,
	ids,
	card,
	onChange,
}: AlignSectionProps) {
	const selected = elements.filter((el) => ids.includes(el.id));
	const movable = selected.filter((el) => !el.locked);
	const target = alignTarget(elements, ids, card);
	if (!target) return null;
	return (
		<PanelSection
			title={
				selected.length === 1 ? "Выравнивание по карточке" : "Выравнивание"
			}
			actions={<HelpButton topic="align" />}
		>
			<div className={styles.row}>
				{ALIGN_BUTTONS.map(({ edge, icon, label }) => (
					<IconButton
						key={edge}
						icon={icon}
						label={label}
						disabled={movable.length === 0}
						onClick={() => onChange(alignElements(elements, ids, edge, target))}
					/>
				))}
				{selected.length > 1 && <span className={styles.divider} />}
				{selected.length > 1 &&
					DISTRIBUTE_BUTTONS.map(({ axis, icon, label }) => (
						<IconButton
							key={axis}
							icon={icon}
							label={label}
							disabled={movable.length < 3}
							onClick={() => onChange(distributeElements(elements, ids, axis))}
						/>
					))}
			</div>
		</PanelSection>
	);
}
