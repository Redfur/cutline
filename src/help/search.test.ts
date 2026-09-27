import { describe, expect, it } from "vitest";
import type { HelpSection } from "./content";
import { SECTIONS } from "./content";
import { filterSections } from "./search";

const sections: HelpSection[] = [
	{
		id: "a",
		title: "Экспорт",
		items: [
			{ id: "Форматы", title: "Форматы", text: "PDF и SVG" },
			{ id: "Спуск", title: "Спуск", text: "Лист A4" },
		],
	},
	{
		id: "b",
		title: "Данные",
		items: [
			{ id: "Импорт CSV", title: "Импорт CSV", text: "Колонки и поля" },
			{ id: "Таблица", title: "Таблица", text: "Объём не важен" },
		],
	},
	{ id: "c", title: "Клавиши", keys: [{ action: "Отменить", keys: "Mod Z" }] },
];

describe("поиск в справке", () => {
	it("пустой запрос — всё", () => {
		expect(filterSections(sections, "  ")).toBe(sections);
	});

	it("по заголовку раздела — раздел целиком", () => {
		expect(filterSections(sections, "экспорт")).toEqual([sections[0]]);
	});

	it("по тексту — только совпавшие пункты", () => {
		const found = filterSections(sections, "csv");
		expect(found.map((s) => s.id)).toEqual(["b"]);
		expect(found[0].items?.map((i) => i.title)).toEqual(["Импорт CSV"]);
	});

	it("регистр и ё не важны, клавиши ищутся по действию", () => {
		expect(filterSections(sections, "ОБЪЕМ")[0].items?.[0].title).toBe(
			"Таблица",
		);
		expect(filterSections(sections, "отмен").map((s) => s.id)).toEqual(["c"]);
	});

	it("ничего не нашлось — пусто", () => {
		expect(filterSections(sections, "фывапр")).toEqual([]);
	});

	it("настоящая справка находит QR", () => {
		const ids = filterSections(SECTIONS, "qr").map((s) => s.id);
		expect(ids).toContain("functions");
	});
});
