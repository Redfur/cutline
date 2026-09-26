// Таблица записей по docs/ui-spec.md, «Экран 2»: строки — записи, колонки — поля.
// Ячейки — обычные <input>, значение берётся из документа на каждом рендере: своего
// состояния у таблицы нет, кроме того, какой заголовок сейчас правится.

import type { RecordProblems } from "../../../data/problems";
import type { DataRecord, FieldDef } from "../../../model/document";
import { Icon } from "../../../ui/core/Icon";
import { IconButton } from "../../../ui/forms/IconButton";
import { FieldHeader } from "./FieldHeader";
import styles from "./RecordsTable.module.css";

const PROBLEM_TITLE = {
	empty: "Пусто, а поле используется в макете",
	overflow: "Текст не влезает в рамку на карточке",
} as const;

export interface RecordsTableProps {
	fields: FieldDef[];
	records: DataRecord[];
	// индексы записей, которые показываем (фильтр «С проблемами»), по возрастанию
	rows: number[];
	problems: RecordProblems[];
	selectedIndex: number | null;
	onSelect: (index: number) => void;
	onCellChange: (index: number, key: string, value: string) => void;
	onDeleteRecord: (index: number) => void;
	onAddField: () => void;
	// поле, которое только что добавили, — его заголовок сразу в режиме правки
	freshFieldKey: string | null;
	onFieldLabelChange: (key: string, label: string) => void;
	onFieldKeyChange: (key: string, newKey: string) => string | null;
	onDeleteField: (key: string) => void;
	// запись, в первую ячейку которой поставить фокус (только что добавленная)
	focusIndex: number | null;
}

export function RecordsTable({
	fields,
	records,
	rows,
	problems,
	selectedIndex,
	onSelect,
	onCellChange,
	onDeleteRecord,
	onAddField,
	freshFieldKey,
	onFieldLabelChange,
	onFieldKeyChange,
	onDeleteField,
	focusIndex,
}: RecordsTableProps) {
	return (
		<table className={styles.table}>
			<colgroup>
				<col className={styles.numCol} />
				{fields.map((f, i) => (
					<col
						key={f.key}
						className={i === 0 ? styles.firstCol : styles.fieldCol}
					/>
				))}
				<col className={styles.addCol} />
				<col />
			</colgroup>
			<thead>
				<tr>
					<th className={`${styles.th} ${styles.numTh}`}>№</th>
					{fields.map((f) => (
						<th key={f.key} className={styles.th}>
							<FieldHeader
								field={f}
								startEditing={f.key === freshFieldKey}
								onLabelChange={(label) => onFieldLabelChange(f.key, label)}
								onKeyChange={(key) => onFieldKeyChange(f.key, key)}
								onDelete={() => onDeleteField(f.key)}
							/>
						</th>
					))}
					<th className={`${styles.th} ${styles.addTh}`}>
						<IconButton
							size="sm"
							icon="plus"
							label="Добавить поле"
							onClick={onAddField}
						/>
					</th>
					<th className={`${styles.th} ${styles.lastTh}`} />
				</tr>
			</thead>
			<tbody>
				{rows.map((index) => {
					const record = records[index] ?? {};
					const cells = problems[index]?.cells ?? {};
					const selected = index === selectedIndex;
					return (
						<tr
							// ключ — индекс: у записей нет id (модель документа), а строки не
							// переставляются, только удаляются — значения всё равно берутся из
							// документа, так что сдвиг ключей не оставит в ячейке чужой текст
							key={index}
							data-row={index}
							className={`${styles.row} ${selected ? styles.selected : ""}`}
							onMouseDown={() => {
								if (!selected) onSelect(index);
							}}
						>
							<td className={`${styles.td} ${styles.numTd}`}>
								<span className={styles.deleteButton}>
									<IconButton
										size="sm"
										icon="trash-2"
										label={`Удалить запись ${index + 1}`}
										onClick={(e) => {
											e.stopPropagation();
											onDeleteRecord(index);
										}}
									/>
								</span>
								<span className={styles.num}>{index + 1}</span>
							</td>
							{fields.map((f, col) => {
								const problem = cells[f.key];
								return (
									<td
										key={f.key}
										className={`${styles.td} ${problem ? styles.problem : ""}`}
										title={problem ? PROBLEM_TITLE[problem] : undefined}
									>
										<input
											className={styles.cell}
											// biome-ignore lint/a11y/noAutofocus: фокус в первую ячейку только что добавленной записи — продолжение нажатия «Добавить запись»
											autoFocus={col === 0 && index === focusIndex}
											aria-label={`${f.label}, запись ${index + 1}`}
											value={record[f.key] ?? ""}
											placeholder={problem === "empty" ? "Пусто" : ""}
											onChange={(e) =>
												onCellChange(index, f.key, e.target.value)
											}
										/>
										{problem && (
											<span className={styles.problemIcon}>
												<Icon
													name={
														problem === "empty"
															? "circle-alert"
															: "triangle-alert"
													}
													size={14}
													strokeWidth={2}
												/>
											</span>
										)}
									</td>
								);
							})}
							<td className={styles.td} />
							<td className={`${styles.td} ${styles.lastTd}`} />
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}
