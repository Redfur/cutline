// CSV в обе стороны. Чистые функции над строками и байтами — без File API и DOM,
// чтобы разбор можно было проверить тестом (скачивание — в export/csv.ts).
import type { DataRecord, FieldDef } from "../model/document";

export type CsvEncoding = "utf-8" | "windows-1251";
export type CsvDelimiter = ";" | "," | "\t";

// Excel с русской локалью сохраняет CSV в Windows-1251 — самая частая причина
// «кракозябр» при импорте. TextDecoder в UTF-8 сам срезает BOM.
export function decodeCsv(bytes: Uint8Array, encoding: CsvEncoding): string {
	return new TextDecoder(encoding).decode(bytes);
}

// Байты 1251 почти никогда не складываются в валидный UTF-8 — декодер заменяет их
// на U+FFFD. Обратное (UTF-8, прочитанный как 1251) так не ловится, но кодировку
// по умолчанию выбираем UTF-8, так что этот случай и не возникает сам.
export function looksMisdecoded(text: string): boolean {
	return text.includes("�");
}

const DELIMITERS: CsvDelimiter[] = [";", ",", "\t"];

// По первой строке вне кавычек: «Иванов, Иван» в кавычках не должно превратить
// точку с запятой в запятую.
export function detectDelimiter(text: string): CsvDelimiter {
	const counts = new Map<CsvDelimiter, number>(DELIMITERS.map((d) => [d, 0]));
	let quoted = false;
	for (const ch of text) {
		if (ch === '"') quoted = !quoted;
		else if (!quoted && (ch === "\n" || ch === "\r")) break;
		else if (!quoted && counts.has(ch as CsvDelimiter)) {
			counts.set(ch as CsvDelimiter, (counts.get(ch as CsvDelimiter) ?? 0) + 1);
		}
	}
	let best: CsvDelimiter = ",";
	let bestCount = 0;
	for (const [d, n] of counts) {
		if (n > bestCount) {
			best = d;
			bestCount = n;
		}
	}
	return best;
}

// RFC 4180: поле в кавычках может содержать разделитель, перевод строки и "" как
// экранированную кавычку. Концы строк — \n, \r\n и одиночный \r (старые Mac/Excel).
export function parseCsv(text: string, delimiter: CsvDelimiter): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = "";
	let quoted = false;
	let i = 0;
	const endCell = () => {
		row.push(cell);
		cell = "";
	};
	const endRow = () => {
		endCell();
		rows.push(row);
		row = [];
	};
	while (i < text.length) {
		const ch = text[i];
		if (quoted) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					cell += '"';
					i++;
				} else {
					quoted = false;
				}
			} else {
				cell += ch;
			}
		} else if (ch === '"' && cell === "") {
			quoted = true;
		} else if (ch === delimiter) {
			endCell();
		} else if (ch === "\r" || ch === "\n") {
			if (ch === "\r" && text[i + 1] === "\n") i++;
			endRow();
		} else {
			cell += ch;
		}
		i++;
	}
	// последняя строка без завершающего перевода строки
	if (cell !== "" || row.length > 0) endRow();
	return rows;
}

export interface CsvTable {
	// названия колонок из первой строки; null — у файла нет строки заголовков
	header: string[] | null;
	rows: string[][];
	// номера строк файла (с 1), пропущенных как пустые, — показываем их в диалоге,
	// чтобы пропажа строк не была сюрпризом
	skipped: number[];
	columnCount: number;
}

const isBlank = (row: string[]) => row.every((c) => !c.trim());

export function toTable(rows: string[][], hasHeader: boolean): CsvTable {
	const columnCount = Math.max(0, ...rows.map((r) => r.length));
	const pad = (r: string[]) =>
		Array.from({ length: columnCount }, (_, i) => r[i] ?? "");
	const skipped: number[] = [];
	const data: string[][] = [];
	rows.forEach((row, i) => {
		if (hasHeader && i === 0) return;
		if (isBlank(row)) skipped.push(i + 1);
		else data.push(pad(row));
	});
	return {
		header: hasHeader && rows[0] ? pad(rows[0]).map((h) => h.trim()) : null,
		rows: data,
		skipped,
		columnCount,
	};
}

// Сопоставление колонки файла: ключ существующего поля, SKIP или NEW_FIELD.
export const SKIP = "";
export const NEW_FIELD = "+new";

// Колонка сопоставляется с полем по названию или ключу без учёта регистра — так
// CSV, выгруженный отсюда же, открывается обратно без ручной работы. Остальные
// идут новыми полями, а не «не импортировать»: молча потерять колонку хуже, чем
// получить лишнюю, которую легко удалить.
export function autoMapping(table: CsvTable, fields: FieldDef[]): string[] {
	const used = new Set<string>();
	return Array.from({ length: table.columnCount }, (_, i) => {
		const name = table.header?.[i]?.toLowerCase();
		const field = name
			? fields.find(
					(f) =>
						!used.has(f.key) &&
						(f.label.toLowerCase() === name || f.key.toLowerCase() === name),
				)
			: undefined;
		if (!field) return NEW_FIELD;
		used.add(field.key);
		return field.key;
	});
}

function escapeCell(value: string, delimiter: CsvDelimiter): string {
	return /["\r\n]/.test(value) || value.includes(delimiter)
		? `"${value.replace(/"/g, '""')}"`
		: value;
}

// Заголовки — названия полей, не ключи: файл открывают в Excel люди, а обратно
// autoMapping узнаёт колонку и по названию. «;» — разделитель, который русский
// Excel понимает без мастера импорта.
export function serializeCsv(
	fields: FieldDef[],
	records: DataRecord[],
	delimiter: CsvDelimiter = ";",
): string {
	const lines = [
		fields.map((f) => escapeCell(f.label, delimiter)),
		...records.map((r) =>
			fields.map((f) => escapeCell(r[f.key] ?? "", delimiter)),
		),
	];
	return `${lines.map((l) => l.join(delimiter)).join("\r\n")}\r\n`;
}
