// Режим «Данные» (docs/ui-spec.md, «Экран 2»). Все правки идут через onChange —
// это history.set оболочки, поэтому набор в ячейке, удаление записи и смена ключа
// отменяются тем же Ctrl+Z, что и правки макета.
import { type ChangeEvent, type MouseEvent, useRef, useState } from "react";
import type { CsvTable } from "../../data/csv";
import { usedFields } from "../../data/placeholders";
import { hasProblems, type RecordProblems } from "../../data/problems";
import { downloadCsv } from "../../export/csv";
import type { CutlineDocument } from "../../model/document";
import { Icon } from "../../ui/core/Icon";
import { Button } from "../../ui/forms/Button";
import {
	addField,
	addRecord,
	deleteField,
	deleteRecord,
	type ImportMode,
	importRecords,
	renameFieldKey,
	setCell,
	setFieldLabel,
} from "../lib/records";
import type { DocumentHistory } from "../lib/useDocumentHistory";
import styles from "./DataMode.module.css";
import { type CsvFile, ImportDialog } from "./ImportDialog";
import { RecordsTable } from "./RecordsTable";
import { type RecordFilter, ThumbnailGrid } from "./ThumbnailGrid";

export interface DataModeProps {
	doc: CutlineDocument;
	onChange: DocumentHistory["set"];
	problems: RecordProblems[];
	// меняется, когда догрузился шрифт, — миниатюры надо перемерить (useFontsVersion)
	fontsVersion: number;
	// выделенная строка — она же текущая запись предпросмотра в «Дизайне»
	selectedIndex: number | null;
	onSelect: (index: number) => void;
	// двойной щелчок по миниатюре — открыть запись в «Дизайне»
	onOpen: (index: number) => void;
}

// Доля высоты под таблицу: 55% — по docs/ui-spec.md, пределы — чтобы ни таблицу,
// ни сетку нельзя было утянуть в ноль и потерять
const INITIAL_SPLIT = 0.55;
const MIN_SPLIT = 0.2;
const MAX_SPLIT = 0.8;

const RENAME_KEY_ERRORS = {
	empty: "Ключ не может быть пустым",
	duplicate: "Такой ключ уже есть",
} as const;

export function DataMode({
	doc,
	onChange,
	problems,
	fontsVersion,
	selectedIndex,
	onSelect,
	onOpen,
}: DataModeProps) {
	const rootRef = useRef<HTMLElement>(null);
	const [split, setSplit] = useState(INITIAL_SPLIT);
	const [filter, setFilter] = useState<RecordFilter>("all");
	const [freshFieldKey, setFreshFieldKey] = useState<string | null>(null);
	const [focusIndex, setFocusIndex] = useState<number | null>(null);
	const [importFile, setImportFile] = useState<CsvFile | null>(null);
	const csvInputRef = useRef<HTMLInputElement>(null);
	const { records, fields } = doc;
	const empty = records.length === 0;
	const rows = records
		.map((_, i) => i)
		.filter((i) => filter === "all" || hasProblems(problems[i]));

	const handleAddRecord = () => {
		const index = records.length;
		onChange(addRecord, { boundary: true });
		// новая запись пустая — при фильтре «С проблемами» она могла бы и не попасть
		// в список, если в макете нет плейсхолдеров; сбрасываем, чтобы точно увидеть
		setFilter("all");
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

	const handleCsvPicked = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = ""; // тот же файл можно выбрать повторно после правки в Excel
		if (!file) return;
		void file
			.arrayBuffer()
			.then((buf) =>
				setImportFile({ name: file.name, bytes: new Uint8Array(buf) }),
			);
	};

	const handleImport = (
		table: CsvTable,
		mapping: string[],
		mode: ImportMode,
	) => {
		const firstNew = mode === "append" ? records.length : 0;
		// один шаг истории на весь импорт: Ctrl+Z возвращает таблицу как была
		onChange((d) => importRecords(d, table, mapping, mode), {
			boundary: true,
		});
		setImportFile(null);
		setFilter("all");
		onSelect(firstNew);
	};

	const csv = (
		<>
			<input
				ref={csvInputRef}
				type="file"
				accept=".csv,.tsv,.txt,text/csv"
				className={styles.fileInput}
				onChange={handleCsvPicked}
			/>
			{importFile && (
				<ImportDialog
					// другой файл — свежее состояние диалога (кодировка, сопоставление)
					key={`${importFile.name}-${importFile.bytes.length}`}
					file={importFile}
					fields={fields}
					usedKeys={[...usedFields(doc).keys()]}
					hasRecords={records.length > 0}
					onCancel={() => setImportFile(null)}
					onPickOther={() => csvInputRef.current?.click()}
					onImport={handleImport}
				/>
			)}
		</>
	);
	const pickCsv = () => csvInputRef.current?.click();

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
						<Button icon="file-text" onClick={pickCsv}>
							Импорт CSV
						</Button>
					</div>
				</div>
				{csv}
			</main>
		);
	}

	const handleSplitDown = (e: MouseEvent) => {
		e.preventDefault();
		const root = rootRef.current;
		if (!root) return;
		const rect = root.getBoundingClientRect();
		const onMove = (ev: globalThis.MouseEvent) => {
			const ratio = (ev.clientY - rect.top) / rect.height;
			setSplit(Math.max(MIN_SPLIT, Math.min(MAX_SPLIT, ratio)));
		};
		const onUp = () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
			document.body.classList.remove(styles.resizing ?? "");
		};
		// курсор на body: иначе при быстром движении мышь уходит с полоски
		// разделителя и курсор мигает обратно в стрелку
		document.body.classList.add(styles.resizing ?? "");
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
	};

	return (
		<main ref={rootRef} className={styles.root}>
			<section
				className={styles.tableSection}
				style={{ height: `${split * 100}%` }}
			>
				<div className={styles.tableScroll}>{table}</div>
				<div className={styles.toolbar}>
					<Button size="sm" icon="plus" onClick={handleAddRecord}>
						Добавить запись
					</Button>
					<Button size="sm" variant="ghost" icon="file-text" onClick={pickCsv}>
						Импорт CSV
					</Button>
					<Button
						size="sm"
						variant="ghost"
						icon="download"
						onClick={() => downloadCsv(fields, records, "cutline-data.csv")}
					>
						Экспорт CSV
					</Button>
				</div>
			</section>
			{/* Разделитель тянется только мышью, как и направляющие холста: это настройка
			    вида, а не данные, и клавиатурный путь к ней не нужен */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: см. комментарий выше */}
			<div
				className={styles.splitter}
				title="Потяните, чтобы изменить высоту"
				onMouseDown={handleSplitDown}
			>
				<div className={styles.splitterLine} />
				<div className={styles.splitterGrip} />
			</div>
			<ThumbnailGrid
				doc={doc}
				rows={rows}
				problems={problems}
				fontsVersion={fontsVersion}
				filter={filter}
				onFilterChange={setFilter}
				selectedIndex={selectedIndex}
				onSelect={onSelect}
				onOpen={onOpen}
			/>
			{csv}
		</main>
	);
}
