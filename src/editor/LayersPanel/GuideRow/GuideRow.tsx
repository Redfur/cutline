import type { Guide } from "../../../model/document";
import { Icon } from "../../../ui/core/Icon";
import styles from "./GuideRow.module.css";

export interface GuideRowProps {
	guide: Guide;
	selected: boolean;
	onClick: () => void;
}

export function GuideRow({ guide, selected, onClick }: GuideRowProps) {
	const label = Number.isInteger(guide.positionMm)
		? guide.positionMm
		: Math.round(guide.positionMm * 10) / 10;
	return (
		<button
			type="button"
			onClick={onClick}
			className={`${styles.guideRow} ${selected ? styles.selected : ""}`}
		>
			<Icon name="ruler" size={14} />
			{guide.axis === "x" ? "X" : "Y"} · {label} мм
		</button>
	);
}
