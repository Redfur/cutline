// Решения диалога экспорта без JSX: какие карточки уйдут в файл, как подписать
// раскладку, какие из выбранных записей с проблемами.
import { sampleRecord } from "../../data/placeholders";
import { hasProblems, type RecordProblems } from "../../data/problems";
import type { ExportCard } from "../../export/batch";
import type { LayoutOption } from "../../export/imposition";
import { parseRecordRange } from "../../export/recordRange";
import type { DataRecord, FieldDef } from "../../model/document";
import { plural } from "./plural";

export type RecordsChoice = "all" | "current" | "range";

export type CardsChoice =
	| { ok: true; cards: ExportCard[] }
	| { ok: false; error: string };

export function chooseCards(
	records: DataRecord[],
	fields: FieldDef[],
	choice: RecordsChoice,
	currentIndex: number,
	rangeText: string,
): CardsChoice {
	// без записей экспортируется макет на примере данных — как его видно на холсте
	if (!records.length) {
		return { ok: true, cards: [{ record: sampleRecord(fields), index: 0 }] };
	}
	if (choice === "all") {
		return {
			ok: true,
			cards: records.map((record, index) => ({ record, index })),
		};
	}
	if (choice === "current") {
		const index = Math.min(Math.max(currentIndex, 0), records.length - 1);
		return { ok: true, cards: [{ record: records[index], index }] };
	}
	const range = parseRecordRange(rangeText, records.length);
	if (!range.ok) return range;
	return {
		ok: true,
		cards: range.indices.map((index) => ({ record: records[index], index })),
	};
}

export function cardsCount(n: number): string {
	return `${n} ${plural(n, "карточка", "карточки", "карточек")}`;
}

export function layoutLabel(option: LayoutOption): string {
	if (!option.sheet) return "Одна карточка на странице";
	if (!option.margin) {
		return `${option.sheet.name}, ${cardsCount(option.perPage)} на листе`;
	}
	const scale = option.scale < 1 ? `, ${Math.floor(option.scale * 100)}%` : "";
	return `${option.sheet.name} для домашнего принтера, ${option.perPage} на листе${scale}`;
}

// Номера записей (с 1) среди выбранных, у которых есть проблемы
export function problemNumbers(
	cards: ExportCard[],
	problems: RecordProblems[],
	hasRecords: boolean,
): number[] {
	if (!hasRecords) return [];
	return cards
		.filter((c) => hasProblems(problems[c.index]))
		.map((c) => c.index + 1);
}

const LISTED = 10;

export function problemsText(numbers: number[]): string {
	const listed = numbers.slice(0, LISTED).join(", ");
	const rest = numbers.length - LISTED;
	return `${plural(numbers.length, "Запись", "Записи", "Записи")} ${listed}${rest > 0 ? ` и ещё ${rest}` : ""}.`;
}
