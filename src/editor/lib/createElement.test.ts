import { describe, expect, it } from "vitest";
import { drawElement, placeElement } from "./createElement";

function geometry(el: { x: number; y: number; w: number; h: number }) {
	return { x: el.x, y: el.y, w: el.w, h: el.h };
}

describe("placeElement", () => {
	it("клик — размер по умолчанию, центр в точке клика", () => {
		expect(geometry(placeElement("rect", { x: 50, y: 50 }))).toEqual({
			x: 35,
			y: 40,
			w: 30,
			h: 20,
		});
	});

	it("фабрика по типу", () => {
		expect(placeElement("text", { x: 0, y: 0 }).type).toBe("text");
		expect(placeElement("line", { x: 0, y: 0 }).h).toBe(0);
	});
});

describe("drawElement", () => {
	it("рамка от точки нажатия до курсора", () => {
		expect(
			geometry(drawElement("rect", { x: 10, y: 20 }, { x: 50, y: 45 })),
		).toEqual({ x: 10, y: 20, w: 40, h: 25 });
	});

	it("тянули влево-вверх — бокс нормализован", () => {
		expect(
			geometry(drawElement("ellipse", { x: 50, y: 45 }, { x: 10, y: 20 })),
		).toEqual({ x: 10, y: 20, w: 40, h: 25 });
	});

	it("рывок по одной оси не даёт нулевую высоту", () => {
		const el = drawElement("text", { x: 10, y: 20 }, { x: 60, y: 20.2 });
		expect(el.h).toBe(1);
		expect(el.w).toBe(50);
	});

	it("минимум по оси, тянутой влево, откладывается от точки нажатия", () => {
		const el = drawElement("image", { x: 10, y: 20 }, { x: 9.8, y: 50 });
		expect(geometry(el)).toEqual({ x: 9, y: 20, w: 1, h: 30 });
	});

	it("Shift — квадрат по большей стороне с учётом направления", () => {
		expect(
			geometry(
				drawElement(
					"rect",
					{ x: 50, y: 50 },
					{ x: 20, y: 60 },
					{ constrain: true },
				),
			),
		).toEqual({ x: 20, y: 50, w: 30, h: 30 });
	});

	it("линия — вектор без нормализации, в любом направлении", () => {
		expect(
			geometry(drawElement("line", { x: 10, y: 50 }, { x: 40, y: 20 })),
		).toEqual({ x: 10, y: 50, w: 30, h: -30 });
	});

	it("линия с Shift прилипает к 45° и к осям без хвостов float", () => {
		const diag = drawElement(
			"line",
			{ x: 0, y: 0 },
			{ x: 30, y: -28 },
			{ constrain: true },
		);
		expect(diag.w).toBeCloseTo(-diag.h, 9);
		expect(diag.w).toBeGreaterThan(0);
		const vertical = drawElement(
			"line",
			{ x: 0, y: 0 },
			{ x: 2, y: -40 },
			{ constrain: true },
		);
		expect(vertical.w).toBe(0);
		expect(vertical.h).toBeCloseTo(-Math.hypot(2, 40), 9);
	});
});
