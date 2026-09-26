import { describe, expect, it } from "vitest";
import {
	boundsOf,
	cleanGeometry,
	cleanMm,
	lineLength,
	roundMouseMm,
} from "./geometry";

describe("boundsOf", () => {
	it("обычный бокс как есть", () => {
		expect(boundsOf({ x: 1, y: 2, w: 3, h: 4 })).toEqual({
			x: 1,
			y: 2,
			w: 3,
			h: 4,
		});
	});

	it("линия вверх-влево — нормализованная коробка", () => {
		expect(boundsOf({ x: 40, y: 50, w: -30, h: -20 })).toEqual({
			x: 10,
			y: 30,
			w: 30,
			h: 20,
		});
	});
});

describe("lineLength", () => {
	it("длина вектора независимо от знака", () => {
		expect(lineLength({ w: -3, h: 4 })).toBe(5);
	});
});

describe("cleanMm / cleanGeometry", () => {
	it("убирает двоичный хвост, точность до 1e-6 сохраняет", () => {
		expect(cleanMm(47.37500000000001)).toBe(47.375);
		expect(cleanMm(0.1 + 0.2)).toBe(0.3);
		expect(cleanMm(12.3456789)).toBe(12.345679);
	});

	it("к x/y/w/h, остальное как было", () => {
		const el = { x: 0.1 + 0.2, y: 1, w: -3.0000000001, h: 0, name: "a" };
		expect(cleanGeometry(el)).toEqual({ x: 0.3, y: 1, w: -3, h: 0, name: "a" });
	});
});

describe("roundMouseMm", () => {
	it("до 0.1 мм без двоичного хвоста", () => {
		expect(roundMouseMm(10.175)).toBe(10.2);
		expect(roundMouseMm(-3.04)).toBe(-3);
		expect(roundMouseMm(0.7)).toBe(0.7);
	});
});
