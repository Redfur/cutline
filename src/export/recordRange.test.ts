import { describe, expect, it } from "vitest";
import { parseRecordRange } from "./recordRange";

describe("parseRecordRange", () => {
	it("номера и диапазоны через дефис и тире, индексы с 0", () => {
		expect(parseRecordRange("1-3, 8, 10–11", 12)).toEqual({
			ok: true,
			indices: [0, 1, 2, 7, 9, 10],
		});
	});

	it("пробелы вокруг тире и вместо запятых", () => {
		expect(parseRecordRange(" 2 - 4  6 ", 10)).toEqual({
			ok: true,
			indices: [1, 2, 3, 5],
		});
	});

	it("повторы убираются, порядок — как написано", () => {
		expect(parseRecordRange("5, 1-3, 2", 5)).toEqual({
			ok: true,
			indices: [4, 0, 1, 2],
		});
	});

	it("обратный диапазон — по убыванию", () => {
		expect(parseRecordRange("3-1", 3)).toEqual({
			ok: true,
			indices: [2, 1, 0],
		});
	});

	it("за пределами записей — ошибка с числом записей", () => {
		const result = parseRecordRange("2, 5", 3);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain("всего 3");
		expect(parseRecordRange("0", 3).ok).toBe(false);
	});

	it("пусто и мусор — ошибка", () => {
		expect(parseRecordRange("  ", 3).ok).toBe(false);
		expect(parseRecordRange("1, два", 3).ok).toBe(false);
	});
});
