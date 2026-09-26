// Проблемы записи — то, ради чего режим «Данные» существует: на двадцати пяти
// карточках глазами переполнение не найти. Считается той же раскладкой, что рисует
// render(), поэтому «подсвечено» и «обрезано в файле» — одно и то же.
import type { CutlineDocument, DataRecord } from "../model/document";
import { layoutText } from "../render/layout";
import { usedFields } from "./placeholders";

export type CellProblem = "empty" | "overflow";

export interface RecordProblems {
	// по ключу поля; только поля из doc.fields — у неизвестного ключа нет колонки,
	// и пометить в таблице нечего
	cells: Record<string, CellProblem>;
	// id текстовых элементов, которые не влезли в рамку на этой записи
	overflowIds: string[];
}

export function hasProblems(p: RecordProblems | undefined): boolean {
	return !!p && (p.overflowIds.length > 0 || Object.keys(p.cells).length > 0);
}

export function recordProblems(
	doc: CutlineDocument,
	record: DataRecord,
	used: Map<string, string[]> = usedFields(doc),
): RecordProblems {
	const cells: Record<string, CellProblem> = {};
	for (const field of doc.fields) {
		if (used.has(field.key) && !(record[field.key] ?? "").trim()) {
			cells[field.key] = "empty";
		}
	}

	const overflowIds: string[] = [];
	for (const el of doc.elements) {
		if (el.type !== "text" || !el.visible) continue;
		if (!layoutText(el, record)?.overflow) continue;
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

	return { cells, overflowIds };
}

// По индексу записи. usedFields — один раз на документ, а не на каждую запись.
export function documentProblems(doc: CutlineDocument): RecordProblems[] {
	const used = usedFields(doc);
	return doc.records.map((record) => recordProblems(doc, record, used));
}
