import { encode } from "uqr";
import { describe, expect, it } from "vitest";
import { qrModules, qrPathData } from "./qr";

const URL = "https://tochka-rosta.example/u/007";

function numbers(d: string): number[] {
	return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

describe("qrPathData", () => {
	it("прямоугольники покрывают ровно тёмные модули", () => {
		const { data, size } = encode(URL, { ecc: "M", border: 0 });
		expect(qrModules(URL)).toBe(size);
		const dark = data.flat().filter(Boolean).length;
		// сторона = size мм → модуль 1 мм, площадь пути = число тёмных модулей
		const d = qrPathData(URL, 0, 0, size);
		const area = d
			.split("Z")
			.filter(Boolean)
			.reduce((sum, rect) => {
				const [x0, y0, x1, , , y1] = numbers(rect);
				return sum + (x1 - x0) * (y1 - y0);
			}, 0);
		expect(area).toBeCloseTo(dark, 6);
	});

	it("только абсолютные M/L/Z — то, что разбирает svgToPdfOps", () => {
		expect(qrPathData(URL, 10, 20, 30)).toMatch(/^[MLZ\d.\s-]+$/);
	});

	it("не выходит за квадрат", () => {
		const values = numbers(qrPathData(URL, 10, 20, 30));
		const xs = values.filter((_, i) => i % 2 === 0);
		const ys = values.filter((_, i) => i % 2 === 1);
		expect(Math.min(...xs)).toBeGreaterThanOrEqual(10);
		expect(Math.max(...xs)).toBeLessThanOrEqual(40);
		expect(Math.min(...ys)).toBeGreaterThanOrEqual(20);
		expect(Math.max(...ys)).toBeLessThanOrEqual(50);
	});

	it("слишком длинный текст — исключение, render() его ловит", () => {
		expect(() => qrPathData("x".repeat(5000), 0, 0, 10)).toThrow();
	});
});
