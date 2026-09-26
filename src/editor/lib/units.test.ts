import { describe, expect, it } from "vitest";
import {
	lineHeightToPct,
	mmToPt,
	pctToLineHeight,
	pctToTracking,
	ptToMm,
	trackingToPct,
} from "./units";

describe("units", () => {
	it("pt ↔ мм: 72 pt — дюйм", () => {
		expect(ptToMm(72)).toBeCloseTo(25.4);
		expect(mmToPt(25.4)).toBe(72);
	});

	it("круг туда-обратно не оставляет float-хвоста", () => {
		expect(mmToPt(ptToMm(12))).toBe(12);
		expect(mmToPt(ptToMm(10.5))).toBe(10.5);
		expect(lineHeightToPct(1.15)).toBe(115);
		expect(lineHeightToPct(pctToLineHeight(120))).toBe(120);
	});

	it("трекинг — процент от кегля", () => {
		expect(trackingToPct(0.5, 5)).toBe(10);
		expect(pctToTracking(10, 5)).toBeCloseTo(0.5);
		expect(trackingToPct(-0.2, 4)).toBe(-5);
	});

	it("при нулевом кегле трекинг 0, а не NaN", () => {
		expect(trackingToPct(1, 0)).toBe(0);
	});
});
