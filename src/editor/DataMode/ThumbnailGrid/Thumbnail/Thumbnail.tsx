// Миниатюра карточки — настоящий render(), а не упрощённая схема, как в мокапе:
// переполнение на миниатюре должно выглядеть так же, как в экспортированном файле.
import { memo, useEffect, useMemo, useRef } from "react";
import type { CutlineDocument, DataRecord } from "../../../../model/document";
import { render } from "../../../../render/render";
import { Icon } from "../../../../ui/core/Icon";
import styles from "./Thumbnail.module.css";

export interface ThumbnailProps {
	// документ без данных — у оболочки он пересобирается только при правке макета,
	// поэтому набор в ячейке перерисовывает одну миниатюру, а не все
	layout: CutlineDocument;
	record: DataRecord;
	index: number;
	label: string;
	problem: boolean;
	selected: boolean;
	// принимают индекс, а не замыкание на него: иначе новая функция на каждый рендер
	// сетки сводила бы memo на нет
	onSelect: (index: number) => void;
	onOpen: (index: number) => void;
}

const OPTS = { outlines: false, bleed: false, marks: false };

export const Thumbnail = memo(function Thumbnail({
	layout,
	record,
	index,
	label,
	problem,
	selected,
	onSelect,
	onOpen,
}: ThumbnailProps) {
	const ref = useRef<HTMLButtonElement>(null);
	const svg = useMemo(() => render(layout, record, OPTS), [layout, record]);

	// выделили строку в таблице — миниатюра подъезжает в видимую часть сетки;
	// nearest не дёргает прокрутку, если она и так видна
	useEffect(() => {
		if (selected) ref.current?.scrollIntoView({ block: "nearest" });
	}, [selected]);

	return (
		<button
			ref={ref}
			type="button"
			data-thumb={index}
			className={styles.thumb}
			onClick={() => onSelect(index)}
			onDoubleClick={() => onOpen(index)}
			aria-label={`Запись ${index + 1}${label ? `, ${label}` : ""}`}
			aria-pressed={selected}
		>
			<span
				className={`${styles.card} ${selected ? styles.selected : problem ? styles.problem : ""}`}
				style={{ aspectRatio: `${layout.canvas.w} / ${layout.canvas.h}` }}
			>
				<span
					className={styles.art}
					// biome-ignore lint/security/noDangerouslySetInnerHtml: render() выдаёт доверенный SVG из собственного документа редактора
					dangerouslySetInnerHTML={{ __html: svg }}
				/>
				{problem && (
					<span className={styles.corner}>
						<Icon name="triangle-alert" size={11} strokeWidth={2.25} />
					</span>
				)}
			</span>
			<span className={styles.caption}>
				<span className={`${styles.index} ${problem ? styles.warn : ""}`}>
					{index + 1}
				</span>
				<span className={`${styles.label} ${label ? "" : styles.noLabel}`}>
					{label || "Без имени"}
				</span>
			</span>
		</button>
	);
});
