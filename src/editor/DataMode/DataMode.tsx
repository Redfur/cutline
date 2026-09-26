// Режим «Данные» (docs/ui-spec.md, «Экран 2»). Все правки идут через onChange —
// это history.set оболочки, поэтому набор в ячейке, удаление записи и смена ключа
// отменяются тем же Ctrl+Z, что и правки макета.
import { useState } from "react";
import type { RecordProblems } from "../../data/problems";
import type { CutlineDocument } from "../../model/document";
import { Icon } from "../../ui/core/Icon";
import { Button } from "../../ui/forms/Button";
import {
	addField,
	addRecord,
	deleteField,
	deleteRecord,
	renameFieldKey,
	setCell,
	setFieldLabel,
} from "../lib/records";
import type { DocumentHistory } from "../lib/useDocumentHistory";
import styles from "./DataMode.module.css";
import { RecordsTable } from "./RecordsTable";

export interface DataModeProps {
	doc: CutlineDocument;
	onChange: DocumentHistory["set"];
	problems: RecordProblems[];
	// выделенная строка — она же текущая запись предпросмотра в «Дизайне»
	selectedIndex: number | null;
	onSelect: (index: number) => void;
}

const RENAME_KEY_ERRORS = {
	empty: "Ключ не может быть пустым",
	duplicate: "Такой ключ уже есть",
} as const;

export function DataMode({
	doc,
	onChange,
	problems,
	selectedIndex,
	onSelect,
}: DataModeProps) {
	const [freshFieldKey, setFreshFieldKey] = useState<string | null>(null);
	const [focusIndex, setFocusIndex] = useState<number | null>(null);
	const { records, fields } = doc;
	const empty = records.length === 0;
	const rows = records.map((_, i) => i);

	const handleAddRecord = () => {
		const index = records.length;
		onChange(addRecord, { boundary: true });
		onSelect(index);
		setFocusIndex(index);
	};

	const handleAddField = () => {
		// ключ считаем от текущего doc, а не внутри апдейтера: он нужен здесь же,
		// чтобы открыть заголовок в правке, и совпадёт — между кликом и коммитом
		// документ никто не меняет
		const { key } = addField(doc);
		onChange((d) => addField(d).doc, { boundary: true });
		setFreshFieldKey(key);
	};

	const handleFieldKeyChange = (key: string, newKey: string) => {
		const result = renameFieldKey(doc, key, newKey);
		if (typeof result === "string") return RENAME_KEY_ERRORS[result];
		if (result !== doc) {
			onChange(
				(d) => {
					const next = renameFieldKey(d, key, newKey);
					return typeof next === "string" ? d : next;
				},
				{ boundary: true },
			);
		}
		return null;
	};

	const table = (
		<RecordsTable
			fields={fields}
			records={records}
			rows={rows}
			problems={problems}
			selectedIndex={selectedIndex}
			onSelect={onSelect}
			onCellChange={(index, key, value) =>
				onChange((d) => setCell(d, index, key, value))
			}
			onDeleteRecord={(index) =>
				onChange((d) => deleteRecord(d, index), { boundary: true })
			}
			onAddField={handleAddField}
			freshFieldKey={freshFieldKey}
			onFieldLabelChange={(key, label) =>
				onChange((d) => setFieldLabel(d, key, label), { boundary: true })
			}
			onFieldKeyChange={handleFieldKeyChange}
			onDeleteField={(key) =>
				onChange((d) => deleteField(d, key), { boundary: true })
			}
			focusIndex={focusIndex}
		/>
	);

	if (empty) {
		return (
			<main className={styles.root}>
				<div className={styles.emptyTable}>{table}</div>
				<div className={styles.empty}>
					<span className={styles.emptyIcon}>
						<Icon name="table-2" size={24} />
					</span>
					<div className={styles.emptyTitle}>Записей пока нет</div>
					<div className={styles.emptyText}>
						Каждая запись станет отдельной карточкой в тираже. Добавьте записи
						вручную или загрузите таблицу.
					</div>
					<div className={styles.actions}>
						<Button variant="primary" icon="plus" onClick={handleAddRecord}>
							Добавить запись
						</Button>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className={styles.root}>
			<section className={styles.tableSection}>
				<div className={styles.tableScroll}>{table}</div>
				<div className={styles.toolbar}>
					<Button size="sm" icon="plus" onClick={handleAddRecord}>
						Добавить запись
					</Button>
				</div>
			</section>
		</main>
	);
}
