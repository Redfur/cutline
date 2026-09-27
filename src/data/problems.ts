// Проблемы записи — то, ради чего режим «Данные» существует: на двадцати пяти
// карточках глазами переполнение не найти. Считается той же раскладкой, что рисует
// render(), поэтому «подсвечено» и «обрезано в файле» — одно и то же.
import type { CutlineDocument, DataRecord } from "../model/document";
import { layoutText } from "../render/layout";
import { qrModules } from "../render/qr";
import {
	evaluate,
	imageSource,
	type PlaceholderError,
	placeholderKeys,
	requiredFields,
	type Scope,
	usedFields,
} from "./placeholders";

// error — функция в плейсхолдере не смогла посчитать значение этой записи
// (num() от «абв»): ячейка аргумента подсвечивается, как пустая;
// broken — картинка по ссылке из этой ячейки не загрузилась
export type CellProblem = "empty" | "overflow" | "error" | "broken";

export interface ElementError {
	elementId: string;
	message: string;
}

export interface RecordProblems {
	// по ключу поля; только поля из doc.fields — у неизвестного ключа нет колонки,
	// и пометить в таблице нечего
	cells: Record<string, CellProblem>;
	// id текстовых элементов, которые не влезли в рамку на этой записи
	overflowIds: string[];
	// ошибки функций на этой записи; ошибки шаблона (неизвестная функция) сюда не
	// попадают — они одни на все записи и видны в инспекторе
	errors: ElementError[];
}

export function hasProblems(p: RecordProblems | undefined): boolean {
	return (
		!!p &&
		(p.overflowIds.length > 0 ||
			p.errors.length > 0 ||
			Object.keys(p.cells).length > 0)
	);
}

// usedFields/requiredFields — один раз на документ, а не на каждую запись
export interface FieldUse {
	used: Map<string, string[]>;
	required: Map<string, string[]>;
}

export function fieldUse(doc: CutlineDocument): FieldUse {
	return { used: usedFields(doc), required: requiredFields(doc) };
}

// Ошибки источника картинки: функции плюс QR, в который текст не влез, — render() его
// просто не нарисует, и без этой проверки на карточке была бы пустота без объяснения
function imageErrors(src: string, scope: Scope): PlaceholderError[] {
	const { source, errors } = imageSource(src, scope);
	if (source.kind !== "qr") return errors;
	try {
		qrModules(source.text);
		return errors;
	} catch {
		return [
			...errors,
			{
				message: `qr(): текст слишком длинный для QR-кода (${source.text.length} знаков)`,
				keys: placeholderKeys(src),
				static: false,
			},
		];
	}
}

const NONE: ReadonlySet<string> = new Set();

// Ссылка в сообщении — без середины: data URI фотографии занимает мегабайт
function shortHref(href: string): string {
	return href.length > 60 ? `${href.slice(0, 40)}…${href.slice(-15)}` : href;
}

// Все ссылки картинок документа по всем записям (без записей — по примеру полей, как
// их показывает холст). Их проверяет редактор (useBrokenImages): render() в сеть не ходит
export function imageHrefs(
	doc: CutlineDocument,
	fallback: DataRecord,
): Set<string> {
	const hrefs = new Set<string>();
	const records = doc.records.length ? doc.records : [fallback];
	for (const el of doc.elements) {
		if (el.type !== "image" || !el.visible) continue;
		records.forEach((record, i) => {
			const { source } = imageSource(el.src, { record, n: i + 1 });
			if (source.kind === "href") hrefs.add(source.href);
		});
	}
	return hrefs;
}

// broken — ссылки, которые не загрузились (useBrokenImages); по умолчанию — никаких
export function recordProblems(
	doc: CutlineDocument,
	scope: Scope,
	use: FieldUse = fieldUse(doc),
	broken: ReadonlySet<string> = NONE,
): RecordProblems {
	const { record } = scope;
	const { used, required } = use;
	const cells: Record<string, CellProblem> = {};
	for (const field of doc.fields) {
		if (required.has(field.key) && !(record[field.key] ?? "").trim()) {
			cells[field.key] = "empty";
		}
	}

	const errors: ElementError[] = [];
	for (const el of doc.elements) {
		if (!el.visible) continue;
		const found =
			el.type === "text"
				? evaluate(el.content, scope).errors
				: el.type === "image"
					? imageErrors(el.src, scope)
					: [];
		for (const e of found) {
			if (e.static) continue;
			errors.push({ elementId: el.id, message: e.message });
			for (const key of e.keys) if (!cells[key]) cells[key] = "error";
		}
		if (el.type !== "image" || !broken.size) continue;
		const { source } = imageSource(el.src, scope);
		if (source.kind === "href" && broken.has(source.href)) {
			errors.push({
				elementId: el.id,
				message: `Картинка не загрузилась: ${shortHref(source.href)}`,
			});
			for (const key of placeholderKeys(el.src)) {
				if (!cells[key]) cells[key] = "broken";
			}
		}
	}

	const overflowIds: string[] = [];
	for (const el of doc.elements) {
		if (el.type !== "text" || !el.visible) continue;
		if (!layoutText(el, scope)?.overflow) continue;
		overflowIds.push(el.id);
		// ячейку помечаем по каждому полю этого элемента: какое из них «виновато»
		// в "{{city}}, {{country}}", не определить, а человеку надо видеть оба.
		// «Пусто» важнее: пустое поле в переполненном элементе — отдельная причина.
		for (const [key, ids] of used) {
			if (ids.includes(el.id) && !cells[key]) {
				cells[key] = "overflow";
			}
		}
	}
	for (const key of Object.keys(cells)) {
		if (!doc.fields.some((f) => f.key === key)) delete cells[key];
	}

	return { cells, overflowIds, errors };
}

// По индексу записи; номер записи для n() — индекс + 1
export function documentProblems(
	doc: CutlineDocument,
	broken: ReadonlySet<string> = NONE,
): RecordProblems[] {
	const use = fieldUse(doc);
	return doc.records.map((record: DataRecord, i) =>
		recordProblems(doc, { record, n: i + 1 }, use, broken),
	);
}
