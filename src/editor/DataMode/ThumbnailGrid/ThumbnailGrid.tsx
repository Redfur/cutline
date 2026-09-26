// Сетка миниатюр всех записей — ради неё режим «Данные» и существует: двадцать пять
// карточек одним экраном, проблемные обведены (docs/roadmap.md, Этап 3).
import { useMemo } from "react";
import { hasProblems, type RecordProblems } from "../../../data/problems";
import type { CutlineDocument } from "../../../model/document";
import { SegmentedControl } from "../../../ui/forms/SegmentedControl";
import { records as recordsCount } from "../../lib/plural";
import { Thumbnail } from "./Thumbnail";
import styles from "./ThumbnailGrid.module.css";

export type RecordFilter = "all" | "problems";

export interface ThumbnailGridProps {
	doc: CutlineDocument;
	rows: number[];
	problems: RecordProblems[];
	fontsVersion: number;
	filter: RecordFilter;
	onFilterChange: (filter: RecordFilter) => void;
	selectedIndex: number | null;
	onSelect: (index: number) => void;
	onOpen: (index: number) => void;
}

export function ThumbnailGrid({
	doc,
	rows,
	problems,
	fontsVersion,
	filter,
	onFilterChange,
	selectedIndex,
	onSelect,
	onOpen,
}: ThumbnailGridProps) {
	const { version, elements, canvas, fonts, fields, records } = doc;
	// Документ без записей: меняется только вместе с макетом, так что правка ячейки
	// не инвалидирует мемо у остальных миниатюр (у них тот же layout и тот же record).
	// Из частей, а не { ...doc }: doc меняется на каждый набранный символ
	// biome-ignore lint/correctness/useExhaustiveDependencies: fontsVersion — см. комментарий у зависимостей
	const layout = useMemo<CutlineDocument>(
		() => ({
			version,
			canvas,
			fonts,
			elements,
			records: [],
			fields: [],
			guides: [],
		}),
		// fontsVersion: новый layout после загрузки шрифта перерисовывает миниатюры,
		// иначе они остались бы свёрстанными по запасному шрифту
		[version, canvas, fonts, elements, fontsVersion],
	);
	const problemCount = problems.filter(hasProblems).length;
	const labelKey = fields[0]?.key;

	return (
		<section className={styles.root}>
			<div className={styles.bar}>
				<SegmentedControl
					value={filter}
					onChange={(v) => onFilterChange(v as RecordFilter)}
					options={[
						{ value: "all", label: "Все" },
						{
							value: "problems",
							label: problemCount
								? `С проблемами · ${problemCount}`
								: "С проблемами",
						},
					]}
				/>
				<span className={styles.count}>
					{filter === "all"
						? recordsCount(records.length)
						: `${rows.length} из ${records.length}`}
				</span>
				<span className={styles.spacer} />
				<span className={styles.hint}>Двойной щелчок — открыть в макете</span>
			</div>
			<div className={styles.scroll}>
				{rows.length ? (
					<div className={styles.grid}>
						{rows.map((index) => {
							const record = records[index] ?? {};
							return (
								<Thumbnail
									key={index}
									layout={layout}
									record={record}
									index={index}
									label={labelKey ? (record[labelKey] ?? "") : ""}
									problem={hasProblems(problems[index])}
									selected={index === selectedIndex}
									onSelect={onSelect}
									onOpen={onOpen}
								/>
							);
						})}
					</div>
				) : (
					<div className={styles.none}>
						Проблем нет — все записи помещаются в макет.
					</div>
				)}
			</div>
		</section>
	);
}
