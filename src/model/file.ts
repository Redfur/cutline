// Сериализация документа в JSON и обратно. Чистые функции — без DOM и без File API,
// это дело export/document.ts (скачивание/открытие — уже не про модель, а про файлы).
import type { CutlineDocument } from "./document";

export function serializeDocument(doc: CutlineDocument): string {
	return JSON.stringify(doc, null, 2);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

const REQUIRED_ARRAY_FIELDS = [
	"fonts",
	"elements",
	"records",
	"fields",
] as const;

// Лёгкая защита от открытия случайного файла — не полноценная валидация схемы
// (та, что упомянута в README для model/, — отдельная, ещё не начатая задача).
export function parseDocument(json: string): CutlineDocument {
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		throw new Error("Файл повреждён — это не JSON");
	}
	if (
		!isPlainObject(parsed) ||
		typeof parsed.version !== "number" ||
		!isPlainObject(parsed.canvas)
	) {
		throw new Error("Файл не похож на документ Cutline");
	}
	for (const field of REQUIRED_ARRAY_FIELDS) {
		if (!Array.isArray(parsed[field])) {
			throw new Error(`Файл не похож на документ Cutline: нет поля "${field}"`);
		}
	}
	return parsed as unknown as CutlineDocument;
}
