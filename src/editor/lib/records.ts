// Правки записей и полей данных — чистые функции документа → документ, чтобы
// оболочка только оборачивала их в history.set, а логику можно было проверить
// тестом без React.
import { type CsvTable, NEW_FIELD, SKIP } from "../../data/csv";
import { normalizeKey, renamePlaceholder } from "../../data/placeholders";
import type {
	CutlineDocument,
	CutlineElement,
	DataRecord,
	FieldDef,
} from "../../model/document";

export function emptyRecord(doc: CutlineDocument): DataRecord {
	return Object.fromEntries(doc.fields.map((f) => [f.key, ""]));
}

export function addRecord(doc: CutlineDocument): CutlineDocument {
	return { ...doc, records: [...doc.records, emptyRecord(doc)] };
}

export function deleteRecord(
	doc: CutlineDocument,
	index: number,
): CutlineDocument {
	return { ...doc, records: doc.records.filter((_, i) => i !== index) };
}

export function setCell(
	doc: CutlineDocument,
	index: number,
	key: string,
	value: string,
): CutlineDocument {
	return {
		...doc,
		records: doc.records.map((r, i) =>
			i === index ? { ...r, [key]: value } : r,
		),
	};
}

function freeFieldKey(fields: FieldDef[]): { key: string; n: number } {
	let n = fields.length + 1;
	while (fields.some((f) => f.key === `field_${n}`)) n++;
	return { key: `field_${n}`, n };
}

// Ключ нового поля латиницей, а не из label: label пользователь сразу переименует,
// а ключ, выросший из «Поле 3», остался бы в {{…}} навсегда.
export function addField(doc: CutlineDocument): {
	doc: CutlineDocument;
	key: string;
} {
	const { key, n } = freeFieldKey(doc.fields);
	return {
		key,
		doc: {
			...doc,
			fields: [...doc.fields, { key, label: `Поле ${n}`, sample: "" }],
			records: doc.records.map((r) => ({ ...r, [key]: "" })),
		},
	};
}

export function setFieldLabel(
	doc: CutlineDocument,
	key: string,
	label: string,
): CutlineDocument {
	return {
		...doc,
		fields: doc.fields.map((f) => (f.key === key ? { ...f, label } : f)),
	};
}

function renameInElement(
	el: CutlineElement,
	oldKey: string,
	newKey: string,
): CutlineElement {
	if (el.type === "text") {
		return { ...el, content: renamePlaceholder(el.content, oldKey, newKey) };
	}
	if (el.type === "image") {
		return { ...el, src: renamePlaceholder(el.src, oldKey, newKey) };
	}
	return el;
}

export type RenameKeyError = "empty" | "duplicate";

// Смена ключа переписывает и записи, и {{old}} в макете: иначе после переименования
// колонки все карточки молча опустели бы.
export function renameFieldKey(
	doc: CutlineDocument,
	oldKey: string,
	rawKey: string,
): CutlineDocument | RenameKeyError {
	const newKey = normalizeKey(rawKey);
	if (!newKey) return "empty";
	if (newKey === oldKey) return doc;
	if (doc.fields.some((f) => f.key === newKey)) return "duplicate";
	return {
		...doc,
		fields: doc.fields.map((f) =>
			f.key === oldKey ? { ...f, key: newKey } : f,
		),
		records: doc.records.map((r) => {
			const { [oldKey]: value, ...rest } = r;
			return { ...rest, [newKey]: value ?? "" };
		}),
		elements: doc.elements.map((el) => renameInElement(el, oldKey, newKey)),
	};
}

// Плейсхолдер в макете не трогаем: удалённое поле видно как «неизвестное» в
// инспекторе, а undo вернёт колонку вместе с данными.
export function deleteField(
	doc: CutlineDocument,
	key: string,
): CutlineDocument {
	return {
		...doc,
		fields: doc.fields.filter((f) => f.key !== key),
		records: doc.records.map((r) => {
			const { [key]: _removed, ...rest } = r;
			return rest;
		}),
	};
}

export type ImportMode = "replace" | "append";

// Импорт CSV по сопоставлению колонок (ключ поля / SKIP / NEW_FIELD, см. data/csv).
// Здесь, в отличие от «Добавить поле», ключ берётся из заголовка колонки: у файла
// уже есть осмысленные имена, и {{ФИО}} понятнее, чем {{field_7}}.
export function importRecords(
	doc: CutlineDocument,
	table: CsvTable,
	mapping: string[],
	mode: ImportMode,
): CutlineDocument {
	let fields = doc.fields;
	const keys = mapping.map((target, col) => {
		if (target !== NEW_FIELD) return target;
		const header = table.header?.[col] ?? "";
		const fromHeader = normalizeKey(header);
		const key =
			fromHeader && !fields.some((f) => f.key === fromHeader)
				? fromHeader
				: freeFieldKey(fields).key;
		fields = [
			...fields,
			{ key, label: header || `Колонка ${col + 1}`, sample: "" },
		];
		return key;
	});

	// новые записи — со всеми полями документа, как и «Добавить запись»; старые при
	// append получают пустые значения новых полей, чтобы таблица была ровной
	const blank = Object.fromEntries(fields.map((f) => [f.key, ""]));
	const imported = table.rows.map((row) => {
		const record: DataRecord = { ...blank };
		keys.forEach((key, col) => {
			if (key !== SKIP) record[key] = row[col] ?? "";
		});
		return record;
	});
	const records =
		mode === "append"
			? [...doc.records.map((r) => ({ ...blank, ...r })), ...imported]
			: imported;
	return { ...doc, fields, records };
}
