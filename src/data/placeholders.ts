// Плейсхолдеры {{key}} в content текста и src изображения (docs/document-model.md).
// Чистые функции без DOM: ими пользуются и render(), и проверка проблем, и правки
// колонок — один разбор шаблона на весь проект, чтобы они не разошлись в том,
// что считать плейсхолдером.
import type {
	CutlineDocument,
	CutlineElement,
	DataRecord,
	FieldDef,
} from "../model/document";

// Ключ — всё, кроме фигурных скобок: колонка CSV «ФИО» становится ключом как есть.
// \w в JS без флага u — только латиница, и {{ФИО}} молча не подставлялся бы.
// Пробелы по краям внутри скобок прощаем: {{ name }} пишут руками.
const PLACEHOLDER_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function substitute(template: string, record: DataRecord): string {
	return template.replace(
		PLACEHOLDER_RE,
		(_match, key: string) => record[key] ?? "",
	);
}

export function placeholderKeys(template: string): string[] {
	return Array.from(template.matchAll(PLACEHOLDER_RE), (m) => m[1] ?? "");
}

export function renamePlaceholder(
	template: string,
	oldKey: string,
	newKey: string,
): string {
	return template.replace(PLACEHOLDER_RE, (match, key: string) =>
		key === oldKey ? `{{${newKey}}}` : match,
	);
}

// Строка элемента, в которую подставляются данные: у текста content, у картинки src.
export function templateOf(el: CutlineElement): string | null {
	if (el.type === "text") return el.content;
	if (el.type === "image") return el.src;
	return null;
}

// key → id элементов, где он используется. Скрытые элементы не считаются: на
// печать они не попадают, и пустое поле в них — не проблема карточки.
export function usedFields(doc: CutlineDocument): Map<string, string[]> {
	const used = new Map<string, string[]>();
	for (const el of doc.elements) {
		if (!el.visible) continue;
		const template = templateOf(el);
		if (template === null) continue;
		for (const key of placeholderKeys(template)) {
			const ids = used.get(key) ?? [];
			if (!ids.includes(el.id)) ids.push(el.id);
			used.set(key, ids);
		}
	}
	return used;
}

// Запись для предпросмотра, пока настоящих записей нет: макет с {{name}} на пустом
// документе показывал бы пустоту, а не то, как карточка будет выглядеть.
export function sampleRecord(fields: FieldDef[]): DataRecord {
	return Object.fromEntries(fields.map((f) => [f.key, f.sample]));
}

// Ключ, пригодный для {{…}}: без скобок и без пробелов по краям. Пустая строка —
// «ключ не годится», решает вызывающий код.
export function normalizeKey(raw: string): string {
	return raw.replace(/[{}]/g, "").trim();
}
