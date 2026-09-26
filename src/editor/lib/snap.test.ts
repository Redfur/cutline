import { describe, expect, it } from "vitest";
import type { Canvas, CutlineElement, Guide } from "../../model/document";
import { createRect } from "./createElement";
import { snapMove, snapResize } from "./snap";

// бейдж 100×60, вылет 3, безопасное поле 5 — цели по x: -3, 0, 5, 50, 95, 100, 103
const canvas: Canvas = { w: 100, h: 60, bleed: 3, safe: 5, background: "#fff" };
const THRESHOLD = 1;
// y = 12…22 по умолчанию — вдали от всех целей по y, чтобы тест по x не ловил
// попутный снап по другой оси

function box(x: number, y: number, w: number, h: number): CutlineElement {
	return { ...createRect({ x: 0, y: 0 }), x, y, w, h };
}

describe("snapMove", () => {
	it("без целей рядом ничего не двигает", () => {
		expect(snapMove(box(20, 12, 10, 10), [], canvas, [], THRESHOLD)).toEqual({
			x: 20,
			y: 12,
			guides: [],
		});
	});

	it("левый край прилипает к обрезу", () => {
		const r = snapMove(box(0.6, 12, 12, 10), [], canvas, [], THRESHOLD);
		expect(r.x).toBeCloseTo(0);
		expect(r.guides).toEqual([{ axis: "x", positionMm: 0 }]);
	});

	it("правый край прилипает к вылету, нижний — к безопасному полю", () => {
		const r = snapMove(box(92.5, 44.8, 10, 10), [], canvas, [], THRESHOLD);
		expect(r.x + 10).toBeCloseTo(103);
		expect(r.y + 10).toBeCloseTo(55);
	});

	it("центр прилипает к центру холста", () => {
		const r = snapMove(box(45.4, 12, 10, 10), [], canvas, [], THRESHOLD);
		expect(r.x).toBeCloseTo(45);
		expect(r.guides).toContainEqual({ axis: "x", positionMm: 50 });
	});

	it("прилипает к краю и центру другого элемента", () => {
		const other = box(30, 30, 20, 6); // края по y: 30, 33, 36
		const r = snapMove(box(62, 35.3, 10, 10), [other], canvas, [], THRESHOLD);
		expect(r.y).toBeCloseTo(36);
		expect(r.guides).toContainEqual({ axis: "y", positionMm: 36 });
	});

	it("прилипает к пользовательской направляющей только своей оси", () => {
		const guides: Guide[] = [
			{ id: "gx", axis: "x", positionMm: 70 },
			{ id: "gy", axis: "y", positionMm: 70 },
		];
		const r = snapMove(box(70.5, 12, 10, 10), [], canvas, guides, THRESHOLD);
		expect(r.x).toBeCloseTo(70);
		expect(r.y).toBe(12);
	});

	it("за порогом не прилипает", () => {
		const r = snapMove(box(1.5, 12, 10, 10), [], canvas, [], THRESHOLD);
		expect(r.x).toBe(1.5);
		expect(r.guides).toEqual([]);
	});

	it("из нескольких целей в пороге выбирает ближайшую", () => {
		const guides: Guide[] = [{ id: "g", axis: "x", positionMm: 20.2 }];
		// левый край 20.5: направляющая 20.2 ближе, чем правый край на 30.5 → 30 (не в пороге)
		const r = snapMove(box(20.5, 12, 10.3, 10), [], canvas, guides, THRESHOLD);
		expect(r.x).toBeCloseTo(20.2);
	});
});

describe("snapResize", () => {
	it("правый маркер двигает только правый край", () => {
		const r = snapResize(
			box(10, 20, 89.4, 10),
			{ x: 1, y: 0.5 },
			[],
			canvas,
			[],
			THRESHOLD,
		);
		expect(r.x).toBe(10);
		expect(r.x + r.w).toBeCloseTo(100);
		expect(r.guides).toEqual([{ axis: "x", positionMm: 100 }]);
	});

	it("левый маркер держит правый край на месте", () => {
		const r = snapResize(
			box(4.6, 20, 30, 10),
			{ x: 0, y: 0.5 },
			[],
			canvas,
			[],
			THRESHOLD,
		);
		expect(r.x).toBeCloseTo(5);
		expect(r.x + r.w).toBeCloseTo(34.6);
	});

	it("центр неподвижного края не примагничивается (в отличие от snapMove)", () => {
		// центр бокса 50 совпадает с центром холста, но тянем нижний край — по x ничего
		const r = snapResize(
			box(45, 12, 10, 10),
			{ x: 0.5, y: 1 },
			[],
			canvas,
			[],
			THRESHOLD,
		);
		expect(r.guides).toEqual([]);
		expect(r).toMatchObject({ x: 45, y: 12, w: 10, h: 10 });
	});

	it("верхний маркер держит нижний край на месте", () => {
		const r = snapResize(
			box(20, 29.5, 10, 10),
			{ x: 0.5, y: 0 },
			[],
			canvas,
			[],
			THRESHOLD,
		);
		expect(r.y).toBeCloseTo(30);
		expect(r.y + r.h).toBeCloseTo(39.5);
	});
});
