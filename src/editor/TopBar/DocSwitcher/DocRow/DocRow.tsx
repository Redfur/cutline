// Строка списка документов (DocRow в макете): миниатюра, имя, «изменён …». Битая
// запись не открывается — вместо времени причина и «Убрать».
import { useMemo } from "react";
import { sampleRecord } from "../../../../data/placeholders";
import type { CutlineDocument } from "../../../../model/document";
import { render } from "../../../../render/render";
import { Icon } from "../../../../ui/core/Icon";
import { Button } from "../../../../ui/forms/Button";
import styles from "./DocRow.module.css";

export interface DocRowProps {
	name: string;
	// «изменён 2 ч назад»
	time: string;
	// null — ещё загружается
	doc: CutlineDocument | null;
	broken: boolean;
	current: boolean;
	onPick: () => void;
	onRemove: () => void;
}

export function DocRow({
	name,
	time,
	doc,
	broken,
	current,
	onPick,
	onRemove,
}: DocRowProps) {
	// первая запись — как карточку видно в редакторе; без записей — на примере данных
	const thumb = useMemo(
		() =>
			doc
				? render(doc, doc.records[0] ?? sampleRecord(doc.fields), {
						outlines: null,
						bleed: false,
					})
				: "",
		[doc],
	);

	return (
		<div
			role="option"
			aria-selected={current}
			// без aria-disabled: он делал бы недоступной и кнопку «Убрать» внутри строки;
			// открыть битую строку не дают клик и клавиатура ниже
			tabIndex={broken ? -1 : 0}
			className={`${styles.row} ${broken ? styles.broken : ""}`}
			onClick={() => !broken && onPick()}
			onKeyDown={(e) => {
				if (!broken && (e.key === "Enter" || e.key === " ")) {
					e.preventDefault();
					onPick();
				}
			}}
		>
			<span className={styles.thumb}>
				{broken ? (
					<span className={styles.warn}>
						<Icon name="triangle-alert" size={14} />
					</span>
				) : (
					<span
						className={styles.art}
						// biome-ignore lint/security/noDangerouslySetInnerHtml: render() выдаёт доверенный SVG из собственного документа редактора
						dangerouslySetInnerHTML={{ __html: thumb }}
					/>
				)}
			</span>
			<span className={styles.text}>
				<span className={styles.name}>{name}</span>
				<span className={styles.time}>
					{broken ? "Не открывается: файл повреждён" : `изменён ${time}`}
				</span>
			</span>
			{broken ? (
				<Button
					size="sm"
					variant="ghost"
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
				>
					Убрать
				</Button>
			) : (
				current && (
					<span className={styles.check}>
						<Icon name="check" size={14} />
					</span>
				)
			)}
		</div>
	);
}
