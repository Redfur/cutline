// Импорт CSV с сопоставлением колонок (docs/ui-spec.md, «Экран 2», состояние 4;
// мокапы data-import.html и data-import-errors.html). Диалог только собирает решение —
// сам документ меняет importRecords в оболочке одним шагом истории.
import { useMemo, useState } from "react";
import {
	autoMapping,
	type CsvEncoding,
	type CsvTable,
	decodeCsv,
	detectDelimiter,
	looksMisdecoded,
	NEW_FIELD,
	parseCsv,
	SKIP,
	toTable,
} from "../../../data/csv";
import type { FieldDef } from "../../../model/document";
import { Icon } from "../../../ui/core/Icon";
import { InlineAlert } from "../../../ui/feedback/InlineAlert";
import { Button } from "../../../ui/forms/Button";
import { Checkbox } from "../../../ui/forms/Checkbox";
import { SegmentedControl } from "../../../ui/forms/SegmentedControl";
import { Select } from "../../../ui/forms/Select";
import { Dialog } from "../../../ui/overlays/Dialog";
import { plural, records as recordsCount } from "../../lib/plural";
import type { ImportMode } from "../../lib/records";
import styles from "./ImportDialog.module.css";

export interface CsvFile {
	name: string;
	bytes: Uint8Array;
}

export interface ImportDialogProps {
	file: CsvFile;
	fields: FieldDef[];
	// ключи, которые использует макет: не сопоставленные с колонкой — предупреждение
	usedKeys: string[];
	hasRecords: boolean;
	onCancel: () => void;
	onPickOther: () => void;
	onImport: (table: CsvTable, mapping: string[], mode: ImportMode) => void;
}

const DELIMITER_NAMES = { ";": "«;»", ",": "«,»", "\t": "табуляция" };

// Кодировку угадываем один раз при открытии: если UTF-8 даёт U+FFFD, файл почти
// наверняка из русского Excel — сразу 1251, не заставляя человека разбираться.
function initialEncoding(bytes: Uint8Array): CsvEncoding {
	return looksMisdecoded(decodeCsv(bytes, "utf-8")) ? "windows-1251" : "utf-8";
}

export function ImportDialog({
	file,
	fields,
	usedKeys,
	hasRecords,
	onCancel,
	onPickOther,
	onImport,
}: ImportDialogProps) {
	const [encoding, setEncoding] = useState<CsvEncoding>(() =>
		initialEncoding(file.bytes),
	);
	const [hasHeader, setHasHeader] = useState(true);
	const [mode, setMode] = useState<ImportMode>("replace");

	const text = useMemo(
		() => decodeCsv(file.bytes, encoding),
		[file.bytes, encoding],
	);
	const delimiter = useMemo(() => detectDelimiter(text), [text]);
	const table = useMemo(
		() => toTable(parseCsv(text, delimiter), hasHeader),
		[text, delimiter, hasHeader],
	);
	// сопоставление, которое человек поменял руками, живёт до смены разбора файла;
	// после смены кодировки или заголовка колонки другие — считаем заново
	const [manual, setManual] = useState<{
		table: CsvTable;
		mapping: string[];
	} | null>(null);
	const mapping =
		manual?.table === table ? manual.mapping : autoMapping(table, fields);

	const broken = looksMisdecoded(text);
	const mapped = mapping.filter((m) => m !== SKIP && m !== NEW_FIELD);
	const duplicate = mapped.find((m, i) => mapped.indexOf(m) !== i);
	const missing = usedKeys.filter((key) => !mapping.includes(key));
	const nothing = mapping.every((m) => m === SKIP);
	const ready = !broken && !duplicate && !nothing && table.rows.length > 0;
	const fieldLabel = (key: string) =>
		fields.find((f) => f.key === key)?.label ?? key;

	const options = [
		{ value: SKIP, label: "Не импортировать" },
		...fields.map((f) => ({ value: f.key, label: f.label })),
		{ value: NEW_FIELD, label: "+ Новое поле" },
	];

	return (
		<Dialog
			title="Импорт CSV"
			onClose={onCancel}
			width={560}
			footer={
				<>
					<Button onClick={onCancel}>Отмена</Button>
					<Button
						variant="primary"
						disabled={!ready}
						onClick={() => onImport(table, mapping, mode)}
					>
						Импортировать {recordsCount(table.rows.length)}
					</Button>
				</>
			}
		>
			<div className={styles.file}>
				<span className={styles.fileIcon}>
					<Icon name="file-text" size={16} />
				</span>
				<div className={styles.fileInfo}>
					<div className={styles.fileName}>{file.name}</div>
					<div className={styles.fileMeta}>
						{table.rows.length + table.skipped.length + (hasHeader ? 1 : 0)}{" "}
						{plural(
							table.rows.length + table.skipped.length + (hasHeader ? 1 : 0),
							"строка",
							"строки",
							"строк",
						)}{" "}
						· {table.columnCount}{" "}
						{plural(table.columnCount, "колонка", "колонки", "колонок")} ·
						разделитель {DELIMITER_NAMES[delimiter]}
					</div>
				</div>
				<Select
					width={132}
					value={encoding}
					warning={broken}
					onChange={(v) => setEncoding(v as CsvEncoding)}
					options={[
						{ value: "utf-8", label: "UTF-8" },
						{ value: "windows-1251", label: "Windows-1251" },
					]}
				/>
				<Button size="sm" variant="ghost" onClick={onPickOther}>
					Другой файл
				</Button>
			</div>

			{broken && (
				<InlineAlert
					tone="warning"
					title="Текст читается неправильно"
					actions={
						<Button
							size="sm"
							variant="warning"
							onClick={() =>
								setEncoding(encoding === "utf-8" ? "windows-1251" : "utf-8")
							}
						>
							Открыть в {encoding === "utf-8" ? "Windows-1251" : "UTF-8"}
						</Button>
					}
				>
					Похоже, файл сохранён в другой кодировке. Примеры в таблице ниже
					должны стать читаемыми.
				</InlineAlert>
			)}

			<Checkbox
				checked={hasHeader}
				onChange={setHasHeader}
				label="Первая строка — заголовки колонок"
			/>

			<div className={styles.mappingScroll}>
				<table className={styles.mapping}>
					<colgroup>
						<col className={styles.colName} />
						<col />
						<col className={styles.colArrow} />
						<col className={styles.colField} />
					</colgroup>
					<thead>
						<tr>
							<th>Колонка файла</th>
							<th>Пример</th>
							<th />
							<th>Поле документа</th>
						</tr>
					</thead>
					<tbody>
						{mapping.map((target, col) => {
							const off = target === SKIP;
							return (
								// колонки файла не переставляются — номер и есть идентичность
								// biome-ignore lint/suspicious/noArrayIndexKey: см. выше
								<tr key={col} className={off ? styles.off : ""}>
									<td className={styles.name}>
										{table.header?.[col] || `Колонка ${col + 1}`}
									</td>
									<td className={styles.sample}>
										{table.rows[0]?.[col] ?? ""}
									</td>
									<td className={styles.arrow}>
										<Icon name="chevron-right" size={14} />
									</td>
									<td>
										<Select
											value={target}
											warning={!!duplicate && target === duplicate}
											options={options}
											onChange={(v) =>
												setManual({
													table,
													mapping: mapping.map((m, i) => (i === col ? v : m)),
												})
											}
										/>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{duplicate && (
				<InlineAlert tone="warning" title="Две колонки в одно поле">
					Поле «{fieldLabel(duplicate)}» выбрано дважды. Оставьте одну колонку.
				</InlineAlert>
			)}
			{missing.length > 0 && (
				<InlineAlert
					tone="warning"
					title={missing.length === 1 ? "Поле без данных" : "Поля без данных"}
				>
					{missing.map((key) => `{{${key}}}`).join(", ")}{" "}
					{missing.length === 1 ? "используется" : "используются"} в макете, но
					ни одна колонка файла с ним не сопоставлена. На карточках будет пусто.
				</InlineAlert>
			)}
			{table.skipped.length > 0 && !broken && (
				<div className={styles.note}>
					<Icon name="circle-alert" size={14} />
					Пустые строки ({table.skipped.length}) будут пропущены —{" "}
					{table.skipped.length === 1 ? "строка" : "строки"}{" "}
					{table.skipped.join(", ")}.
				</div>
			)}

			{hasRecords && (
				<div className={styles.mode}>
					<span className={styles.modeLabel}>Текущие записи</span>
					<SegmentedControl
						value={mode}
						onChange={(v) => setMode(v as ImportMode)}
						options={[
							{ value: "replace", label: "Заменить" },
							{ value: "append", label: "Добавить к ним" },
						]}
					/>
				</div>
			)}
		</Dialog>
	);
}
