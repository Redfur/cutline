// Имя файла карточки в ZIP: номер записи и значение первого поля — «007-Тима Фахме.png».
// Номер с ведущими нулями, чтобы файлы сортировались в порядке таблицы.
import type { DataRecord, FieldDef } from "../model/document";

const MAX_NAME_LENGTH = 60;

// Запрещённое в именах на Windows/macOS/Linux и управляющие символы
const UNSAFE = /[\\/:*?"<>|\p{Cc}]+/gu;

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
	const name = first
		.replace(UNSAFE, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, MAX_NAME_LENGTH)
		.trim()
		// точка в конце имени на Windows пропадает, а в начале прячет файл
		.replace(/^\.+|\.+$/g, "");
	return `${number}${name ? `-${name}` : ""}.${ext}`;
}
