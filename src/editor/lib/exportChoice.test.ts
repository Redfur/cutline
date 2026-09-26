import { describe, expect, it } from "vitest";
import type { RecordProblems } from "../../data/problems";
import { SHEETS, type SheetFit } from "../../export/imposition";
import {
	chooseCards,
	exportButtonLabel,
	fitToMarginLabel,
	marginHintText,
	pagesText,
	perSheetText,
	previewCaption,
	problemNumbers,
	problemsText,
	problemsTitle,
	sheetLabel,
	tokenRecord,
} from "./exportChoice";

const fields = [
	{ key: "name", label: "Имя", sample: "Имя Фамилия" },
	{ key: "role", label: "Роль", sample: "" },
];
const records = [{ name: "А" }, { name: "Б" }, { name: "В" }];

const sheetFitOf = (patch: Partial<SheetFit>): SheetFit => ({
	cols: 2,
	rows: 1,
	landscape: false,
	scale: 1,
	perSheet: 2,
	widthMm: 210,
	heightMm: 297,
	...patch,
});

describe("chooseCards", () => {
	it("все записи — по порядку с номерами", () => {
		expect(chooseCards(records, fields, "all")).toEqual(
			records.map((record, index) => ({ record, index })),
		);
	});

	it("только макет — одна карточка с плейсхолдерами вместо значений", () => {
		expect(tokenRecord(fields)).toEqual({ name: "{{name}}", role: "{{role}}" });
		expect(chooseCards(records, fields, "layout")).toEqual([
			{ record: { name: "{{name}}", role: "{{role}}" }, index: 0 },
		]);
	});
});

describe("подписи", () => {
	it("кнопка: винительный падеж и макет", () => {
		expect(exportButtonLabel("all", 1)).toBe("Экспортировать 1 карточку");
		expect(exportButtonLabel("all", 3)).toBe("Экспортировать 3 карточки");
		expect(exportButtonLabel("all", 25)).toBe("Экспортировать 25 карточек");
		expect(exportButtonLabel("layout", 1)).toBe("Экспортировать макет");
	});

	it("лист и счётчики", () => {
		expect(sheetLabel(SHEETS[2])).toBe("SRA3, 320×450 мм");
		expect(perSheetText(2, 2)).toBe("2 карточки на листе, 2 листа");
		expect(perSheetText(4, 5)).toBe("4 карточки на листе, 5 листов");
		expect(pagesText("pdf", 1)).toBe("1 страница в PDF");
		expect(pagesText("png", 3)).toBe("3 файла");
	});

	it("подпись превью по формату и раскладке", () => {
		expect(
			previewCaption("pdf", SHEETS[0], sheetFitOf({ landscape: true }), 3, 300),
		).toBe("Лист 1 · A4, альбомный");
		expect(previewCaption("pdf", SHEETS[0], sheetFitOf({}), 3, 300)).toBe(
			"Лист 1 · A4",
		);
		expect(
			previewCaption(
				"pdf",
				null,
				sheetFitOf({ widthMm: 125, heightMm: 168 }),
				3,
				300,
			),
		).toBe("Страница 1 · 125×168 мм");
		expect(previewCaption("png", null, sheetFitOf({}), 3, 600)).toBe(
			"Файл 1 из 3 · PNG, 600 dpi",
		);
		expect(previewCaption("svg", null, sheetFitOf({}), 1, 300)).toBe(
			"Файл 1 из 1 · SVG",
		);
	});

	it("подсказка про поля", () => {
		const hint = { withMargin: 2, withoutMargin: 4, scale: 0.9523 };
		expect(marginHintText(hint)).toBe("С полями встаёт 2 из 4.");
		expect(fitToMarginLabel(hint)).toBe("Уменьшить до 95%, чтобы уместить 4");
	});
});

describe("проблемы", () => {
	const none: RecordProblems = { cells: {}, overflowIds: [] };
	const overflow: RecordProblems = {
		cells: { name: "overflow" },
		overflowIds: ["t"],
	};
	const empty: RecordProblems = { cells: { role: "empty" }, overflowIds: [] };
	const cards = records.map((record, index) => ({ record, index }));

	it("номера с 1 среди уходящих в файл", () => {
		expect(problemNumbers(cards, [none, overflow, empty])).toEqual([2, 3]);
		expect(problemNumbers([cards[0]], [none, overflow, empty])).toEqual([]);
	});

	it("заголовок: только переполнение — как в макете, иначе общий", () => {
		expect(problemsTitle([2], [none, overflow])).toBe(
			"Текст не влезает в 1 записи",
		);
		expect(problemsTitle([2, 3], [none, overflow, empty])).toBe(
			"Проблемы в 2 записях",
		);
	});

	it("длинный список сокращается", () => {
		expect(problemsText([3])).toBe(
			"Запись 3. Их можно исправить или экспортировать как есть.",
		);
		expect(problemsText([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toContain(
			"Записи 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 и ещё 2.",
		);
	});
});
