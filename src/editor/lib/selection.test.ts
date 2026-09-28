import { describe, expect, it } from "vitest";
import type { CutlineElement } from "../../model/document";
import { createRect } from "./createElement";
import {
	elementsInRect,
	rangeSelection,
	selectionBounds,
	toggleSelection,
} from "./selection";

function rect(
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	extra: Partial<CutlineElement> = {},
): CutlineElement {
	return {
		...createRect({ x: 0, y: 0 }),
		id,
		x,
		y,
		w,
		h,
		...extra,
	} as CutlineElement;
}

describe("toggleSelection", () => {
	it("добавляет в конец и убирает", () => {
		expect(toggleSelection(["a"], "b")).toEqual(["a", "b"]);
		expect(toggleSelection(["a", "b"], "a")).toEqual(["b"]);
	});
});

describe("rangeSelection", () => {
	const order = ["a", "b", "c", "d"];

	it("от якоря до строки в любую сторону, в порядке списка", () => {
		expect(rangeSelection(order, "b", "d")).toEqual(["b", "c", "d"]);
		expect(rangeSelection(order, "d", "b")).toEqual(["b", "c", "d"]);
	});

	it("без якоря или с пропавшим якорем — одна строка", () => {
		expect(rangeSelection(order, null, "c")).toEqual(["c"]);
		expect(rangeSelection(order, "x", "c")).toEqual(["c"]);
	});
});

describe("elementsInRect", () => {
	const elements = [
		rect("in", 10, 10, 10, 10),
		rect("touch", 25, 25, 20, 20),
		rect("out", 60, 60, 10, 10),
		rect("hidden", 12, 12, 5, 5, { visible: false }),
		rect("locked", 12, 12, 5, 5, { locked: true }),
		// линия вверх-влево: коробка 30..40 × 0..10
		rect("line", 40, 10, -10, -10, { type: "line" } as Partial<CutlineElement>),
	];

	it("берёт задетые, пропускает скрытые и заблокированные", () => {
		expect(elementsInRect(elements, { x: 0, y: 0, w: 30, h: 30 })).toEqual([
			"in",
			"touch",
			"line",
		]);
	});

	it("пустая область — ничего", () => {
		expect(elementsInRect(elements, { x: 80, y: 0, w: 5, h: 5 })).toEqual([]);
	});
});

describe("selectionBounds", () => {
	it("объединение коробок, линия — нормализованная", () => {
		expect(
			selectionBounds([
				{ x: 10, y: 10, w: 10, h: 10 },
				{ x: 40, y: 5, w: -10, h: 30 },
			]),
		).toEqual({ x: 10, y: 5, w: 30, h: 30 });
	});

	it("пустое выделение — null", () => {
		expect(selectionBounds([])).toBeNull();
	});
});
