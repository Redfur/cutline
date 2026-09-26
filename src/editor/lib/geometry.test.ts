import { describe, expect, it } from "vitest";
import { boundsOf, lineLength } from "./geometry";

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
