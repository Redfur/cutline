import { describe, expect, it } from "vitest";
import type { CutlineElement } from "../../model/document";
import { createRect } from "./createElement";
import {
	type HandlePos,
	moveElement,
	moveLineEnd,
	resizeElement,
	resizeRotated,
} from "./resizeElement";

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

describe("moveLineEnd", () => {
	const line = { x: 10, y: 10, w: 20, h: 0 };

	it("конец едет, начало стоит", () => {
		expect(moveLineEnd(line, "end", 5, -15)).toEqual({
			x: 10,
			y: 10,
			w: 25,
			h: -15,
		});
	});

	it("начало едет, конец стоит", () => {
		const moved = moveLineEnd(line, "start", 40, 5);
		expect(moved).toEqual({ x: 50, y: 15, w: -20, h: -5 });
		// конец (x+w, y+h) — там же, где был: (30, 10)
		expect([moved.x + moved.w, moved.y + moved.h]).toEqual([30, 10]);
	});
});

describe("resizeRotated", () => {
	// точка бокса (u, v ∈ 0..1) в координатах холста с учётом поворота вокруг центра
	function worldPoint(el: CutlineElement, u: number, v: number) {
		const a = (el.rotation * Math.PI) / 180;
		const ox = (u - 0.5) * el.w;
		const oy = (v - 0.5) * el.h;
		return {
			x: el.x + el.w / 2 + ox * Math.cos(a) - oy * Math.sin(a),
			y: el.y + el.h / 2 + ox * Math.sin(a) + oy * Math.cos(a),
		};
	}

	it("без поворота совпадает с resizeElement", () => {
		const start = box(10, 20, 30, 40);
		expect(resizeRotated(start, { x: 1, y: 1 }, 5, 7)).toEqual(
			resizeElement(start, { x: 1, y: 1 }, 5, 7),
		);
	});

	it("при 90° движение мыши вниз растит ширину", () => {
		const start = { ...box(10, 20, 30, 40), rotation: 90 };
		const r = resizeRotated(start, { x: 1, y: 0.5 }, 0, 10);
		expect(r.w).toBeCloseTo(40);
		expect(r.h).toBeCloseTo(40);
	});

	it.each([30, 90, -45, 170])(
		"при %i° противоположный угол остаётся на месте",
		(rotation) => {
			const start = { ...box(10, 20, 30, 40), rotation };
			const r = resizeRotated(start, { x: 1, y: 1 }, 6, -4);
			const before = worldPoint(start, 0, 0);
			const after = worldPoint(r, 0, 0);
			expect(after.x).toBeCloseTo(before.x);
			expect(after.y).toBeCloseTo(before.y);
		},
	);
});
