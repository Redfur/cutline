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

// Лёгкая защита от случайных данных — не полноценная валидация схемы (та, что
// упомянута в README для model/, — отдельная, ещё не начатая задача). Отдельно от
// JSON.parse: документ приходит и из файла (строка), и из IndexedDB (уже объект), и
// проверка у обоих путей должна быть одна.
export function validateDocument(value: unknown): CutlineDocument {
	if (
		!isPlainObject(value) ||
		typeof value.version !== "number" ||
		!isPlainObject(value.canvas)
	) {
		throw new Error("Файл не похож на документ Cutline");
	}
	for (const field of REQUIRED_ARRAY_FIELDS) {
		if (!Array.isArray(value[field])) {
			throw new Error(`Файл не похож на документ Cutline: нет поля "${field}"`);
		}
	}
	// guides — не обязательное поле для проверки: документ, сохранённый до появления
	// направляющих, не должен переставать открываться из-за их отсутствия
	const guides = Array.isArray(value.guides) ? value.guides : [];
	return { ...value, guides } as unknown as CutlineDocument;
}

export function parseDocument(json: string): CutlineDocument {
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		throw new Error("Файл повреждён — это не JSON");
	}
	return validateDocument(parsed);
}
