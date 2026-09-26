// Решения панели экспорта без JSX: какие карточки уйдут в файл и все подписи панели —
// что стоит на листе, сколько страниц, что с проблемными записями.
import type { RecordProblems } from "../../data/problems";
import { hasProblems } from "../../data/problems";
import type { ExportCard, ExportFormat } from "../../export/batch";
import type {
	MarginHint,
	SheetFit,
	SheetFormat,
} from "../../export/imposition";
import type { DataRecord, FieldDef } from "../../model/document";
import { plural } from "./plural";

// «Выбранные» из макета — пока без выбора записей в таблице, в панели неактивны
export type ExportWhat = "all" | "layout";

// «Только макет»: вместо значений — сами плейсхолдеры, как в макете панели (tokenRec)
export function tokenRecord(fields: FieldDef[]): DataRecord {
	return Object.fromEntries(fields.map((f) => [f.key, `{{${f.key}}}`]));
}

export function chooseCards(
	records: DataRecord[],
	fields: FieldDef[],
	what: ExportWhat,
): ExportCard[] {
	if (what === "layout") return [{ record: tokenRecord(fields), index: 0 }];
	return records.map((record, index) => ({ record, index }));
}

export function cardsCount(n: number): string {
	return `${n} ${plural(n, "карточка", "карточки", "карточек")}`;
}

export function exportButtonLabel(what: ExportWhat, n: number): string {
	if (what === "layout") return "Экспортировать макет";
	return `Экспортировать ${n} ${plural(n, "карточку", "карточки", "карточек")}`;
}

function mm(value: number): string {
	return String(Math.round(value * 10) / 10).replace(".", ",");
}

export function sheetLabel(sheet: SheetFormat): string {
	return `${sheet.name}, ${sheet.w}×${sheet.h} мм`;
}

export function perSheetText(perSheet: number, sheets: number): string {
	return `${cardsCount(perSheet)} на листе, ${sheets} ${plural(sheets, "лист", "листа", "листов")}`;
}

// Подпись под превью: что именно на нём показано
export function previewCaption(
	format: ExportFormat,
	sheet: SheetFormat | null,
	fit: SheetFit,
	files: number,
	dpi: number,
): string {
	if (format !== "pdf") {
		return `Файл 1 из ${files} · ${format.toUpperCase()}${format === "png" ? `, ${dpi} dpi` : ""}`;
	}
	if (sheet)
		return `Лист 1 · ${sheet.name}${fit.landscape ? ", альбомный" : ""}`;
	return `Страница 1 · ${mm(fit.widthMm)}×${mm(fit.heightMm)} мм`;
}

export function pagesText(format: ExportFormat, count: number): string {
	if (format === "pdf") {
		return `${count} ${plural(count, "страница", "страницы", "страниц")} в PDF`;
	}
	return `${count} ${plural(count, "файл", "файла", "файлов")}`;
}

export function marginHintText(hint: MarginHint): string {
	return `С полями встаёт ${hint.withMargin} из ${hint.withoutMargin}.`;
}

export function fitToMarginLabel(hint: MarginHint): string {
	return `Уменьшить до ${Math.floor(hint.scale * 100)}%, чтобы уместить ${hint.withoutMargin}`;
}

// Номера записей (с 1) с проблемами — из тех, что уходят в файл
export function problemNumbers(
	cards: ExportCard[],
	problems: RecordProblems[],
): number[] {
	return cards
		.filter((c) => hasProblems(problems[c.index]))
		.map((c) => c.index + 1);
}

// Как в макете — «Текст не влезает…», если все проблемы — переполнение; пустое
// обязательное поле — тоже проблема, тогда заголовок общий
export function problemsTitle(
	numbers: number[],
	problems: RecordProblems[],
): string {
	const n = numbers.length;
	const where = `${n} ${plural(n, "записи", "записях", "записях")}`;
	const onlyOverflow = numbers.every((num) =>
		Object.values(problems[num - 1]?.cells ?? {}).every(
			(c) => c === "overflow",
		),
	);
	return onlyOverflow ? `Текст не влезает в ${where}` : `Проблемы в ${where}`;
}

const LISTED = 10;

export function problemsText(numbers: number[]): string {
	const listed = numbers.slice(0, LISTED).join(", ");
	const rest = numbers.length - LISTED;
	return `${plural(numbers.length, "Запись", "Записи", "Записи")} ${listed}${rest > 0 ? ` и ещё ${rest}` : ""}. Их можно исправить или экспортировать как есть.`;
}
