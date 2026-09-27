// Проблемы записи — то, ради чего режим «Данные» существует: на двадцати пяти
// карточках глазами переполнение не найти. Считается той же раскладкой, что рисует
// render(), поэтому «подсвечено» и «обрезано в файле» — одно и то же.
import type { CutlineDocument, DataRecord } from "../model/document";
import { layoutText } from "../render/layout";
import {
	evaluate,
	imageSource,
	requiredFields,
	type Scope,
	usedFields,
} from "./placeholders";

// error — функция в плейсхолдере не смогла посчитать значение этой записи
// (num() от «абв»): ячейка аргумента подсвечивается, как пустая
export type CellProblem = "empty" | "overflow" | "error";

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

export function recordProblems(
	doc: CutlineDocument,
	scope: Scope,
	use: FieldUse = fieldUse(doc),
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
					? imageSource(el.src, scope).errors
					: [];
		for (const e of found) {
			if (e.static) continue;
			errors.push({ elementId: el.id, message: e.message });
			for (const key of e.keys) if (!cells[key]) cells[key] = "error";
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
export function documentProblems(doc: CutlineDocument): RecordProblems[] {
	const use = fieldUse(doc);
	return doc.records.map((record: DataRecord, i) =>
		recordProblems(doc, { record, n: i + 1 }, use),
	);
}
