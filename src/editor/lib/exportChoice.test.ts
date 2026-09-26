import { describe, expect, it } from "vitest";
import type { RecordProblems } from "../../data/problems";
import { SHEETS } from "../../export/imposition";
import {
	cardsCount,
	chooseCards,
	layoutLabel,
	problemNumbers,
	problemsText,
} from "./exportChoice";

const fields = [{ key: "name", label: "Имя", sample: "Имя Фамилия" }];
const records = [{ name: "А" }, { name: "Б" }, { name: "В" }];

describe("chooseCards", () => {
	it("все записи — по порядку с номерами", () => {
		expect(chooseCards(records, fields, "all", 0, "")).toEqual({
			ok: true,
			cards: records.map((record, index) => ({ record, index })),
		});
	});

	it("текущая запись", () => {
		expect(chooseCards(records, fields, "current", 2, "")).toEqual({
			ok: true,
			cards: [{ record: { name: "В" }, index: 2 }],
		});
	});

	it("диапазон и его ошибка", () => {
		const range = chooseCards(records, fields, "range", 0, "1, 3");
		expect(range.ok && range.cards.map((c) => c.index)).toEqual([0, 2]);
		expect(chooseCards(records, fields, "range", 0, "5").ok).toBe(false);
	});

	it("без записей — одна карточка на примере данных", () => {
		expect(chooseCards([], fields, "range", 0, "мусор")).toEqual({
			ok: true,
			cards: [{ record: { name: "Имя Фамилия" }, index: 0 }],
		});
	});
});

describe("layoutLabel", () => {
	const [A4] = SHEETS;
	it("одна на странице, лист, домашний с процентом", () => {
		expect(
			layoutLabel({
				id: "single",
				sheet: null,
				margin: 0,
				perPage: 1,
				scale: 1,
			}),
		).toBe("Одна карточка на странице");
		expect(
			layoutLabel({ id: "A4", sheet: A4, margin: 0, perPage: 4, scale: 1 }),
		).toBe("A4, 4 карточки на листе");
		expect(
			layoutLabel({
				id: "A4-home",
				sheet: A4,
				margin: 5,
				perPage: 4,
				scale: 0.9523,
			}),
		).toBe("A4 для домашнего принтера, 4 на листе, 95%");
	});

	it("склонение карточек", () => {
		expect(cardsCount(1)).toBe("1 карточка");
		expect(cardsCount(2)).toBe("2 карточки");
		expect(cardsCount(8)).toBe("8 карточек");
	});
});

describe("problemNumbers", () => {
	const none: RecordProblems = { cells: {}, overflowIds: [] };
	const overflow: RecordProblems = { cells: {}, overflowIds: ["t"] };
	const cards = records.map((record, index) => ({ record, index }));

	it("номера с 1 только среди выбранных", () => {
		expect(problemNumbers(cards, [none, overflow, overflow], true)).toEqual([
			2, 3,
		]);
		expect(
			problemNumbers([cards[0], cards[2]], [none, overflow, overflow], true),
		).toEqual([3]);
	});

	it("пример данных без записей — не проблема тиража", () => {
		expect(problemNumbers([cards[0]], [overflow], false)).toEqual([]);
	});

	it("длинный список сокращается", () => {
		expect(problemsText([3])).toBe("Запись 3.");
		expect(problemsText([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe(
			"Записи 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 и ещё 2.",
		);
	});
});
