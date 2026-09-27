// Имена файлов из пользовательского текста: карточка в ZIP — номер записи и значение
// первого поля («007-Тима Фахме.png», номер с нулями — чтобы сортировалось в порядке
// таблицы), документ — его имя («Бейдж участника.json»).
import type { DataRecord, FieldDef } from "../model/document";

const MAX_NAME_LENGTH = 60;

// Запрещённое в именах на Windows/macOS/Linux и управляющие символы
const UNSAFE = /[\\/:*?"<>|\p{Cc}]+/gu;

// Текст → безопасная часть имени файла; пусто, если от текста ничего не осталось
export function safeFileName(text: string): string {
	return (
		text
			.replace(UNSAFE, " ")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, MAX_NAME_LENGTH)
			.trim()
			// точка в конце имени на Windows пропадает, а в начале прячет файл
			.replace(/^\.+|\.+$/g, "")
	);
}

// Имя файла документа; «cutline» — если имя целиком из запрещённых символов
export function documentFileName(docName: string, ext: string): string {
	return `${safeFileName(docName) || "cutline"}.${ext}`;
}

export function cardFileName(
	index: number,
	total: number,
	record: DataRecord,
	fields: FieldDef[],
	ext: string,
): string {
	const number = String(index + 1).padStart(
		Math.max(3, String(total).length),
		"0",
	);
	const first = fields[0] ? (record[fields[0].key] ?? "") : "";
	const name = safeFileName(first);
	return `${number}${name ? `-${name}` : ""}.${ext}`;
}
