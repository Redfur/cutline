import { describe, expect, it } from "vitest";
import type { CutlineElement } from "../model/document";
import { createRect } from "./createElement";
import { type HandlePos, moveElement, resizeElement } from "./resizeElement";

function box(x: number, y: number, w: number, h: number): CutlineElement {
	return { ...createRect({ x: 0, y: 0 }), x, y, w, h };
}

function geometry(el: CutlineElement) {
	return { x: el.x, y: el.y, w: el.w, h: el.h };
}

describe("resizeElement", () => {
	const start = box(10, 20, 30, 40);

	it.each<[HandlePos, { x: number; y: number; w: number; h: number }]>([
		[
			{ x: 0, y: 0 },
			{ x: 15, y: 27, w: 25, h: 33 },
		],
		[
			{ x: 0.5, y: 0 },
			{ x: 10, y: 27, w: 30, h: 33 },
		],
		[
			{ x: 1, y: 0 },
			{ x: 10, y: 27, w: 35, h: 33 },
		],
		[
			{ x: 0, y: 0.5 },
			{ x: 15, y: 20, w: 25, h: 40 },
		],
		[
			{ x: 1, y: 0.5 },
			{ x: 10, y: 20, w: 35, h: 40 },
		],
		[
			{ x: 0, y: 1 },
			{ x: 15, y: 20, w: 25, h: 47 },
		],
		[
			{ x: 0.5, y: 1 },
			{ x: 10, y: 20, w: 30, h: 47 },
		],
		[
			{ x: 1, y: 1 },
			{ x: 10, y: 20, w: 35, h: 47 },
		],
	])("маркер %o тянет только свои края", (handle, expected) => {
		expect(geometry(resizeElement(start, handle, 5, 7))).toEqual(expected);
	});

	it("не схлопывается в ноль, неподвижный край остаётся на месте", () => {
		const leftTop = resizeElement(start, { x: 0, y: 0 }, 100, 100);
		expect(leftTop.w).toBeCloseTo(0.1);
		expect(leftTop.h).toBeCloseTo(0.1);
		expect(leftTop.x + leftTop.w).toBeCloseTo(40);
		expect(leftTop.y + leftTop.h).toBeCloseTo(60);

		const rightBottom = resizeElement(start, { x: 1, y: 1 }, -100, -100);
		expect(geometry(rightBottom)).toEqual({ x: 10, y: 20, w: 0.1, h: 0.1 });
	});

	it("не трогает остальные поля элемента", () => {
		const resized = resizeElement(start, { x: 1, y: 1 }, 1, 1);
		expect({ ...resized, x: 0, y: 0, w: 0, h: 0 }).toEqual({
			...start,
			x: 0,
			y: 0,
			w: 0,
			h: 0,
		});
	});
});

describe("moveElement", () => {
	it("сдвигает позицию, не меняя размер", () => {
		expect(geometry(moveElement(box(10, 20, 30, 40), -3, 4))).toEqual({
			x: 7,
			y: 24,
			w: 30,
			h: 40,
		});
	});
});
