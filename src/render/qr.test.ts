import { encode } from "uqr";
import { describe, expect, it } from "vitest";
import type { QrStyle } from "../model/document";
import { qrModules, qrPathData } from "./qr";

const URL = "https://tochka-rosta.example/u/007";
const SQUARE = { modules: "square", eyes: "square" } as const;

function numbers(d: string): number[] {
	return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

// Площадь со знаком по многоугольникам из M/L: дырки (обратный обход) вычитаются
function signedArea(d: string): number {
	return d
		.split("Z")
		.filter(Boolean)
		.reduce((sum, contour) => {
			const v = numbers(contour);
			let a = 0;
			for (let i = 0; i < v.length; i += 2) {
				const j = (i + 2) % v.length;
				a += v[i] * v[j + 1] - v[j] * v[i + 1];
			}
			return sum + a / 2;
		}, 0);
}

const ALL: Pick<QrStyle, "modules" | "eyes">[] = (
	["square", "rounded", "dots"] as const
).flatMap((modules) =>
	(["square", "rounded", "circle"] as const).map((eyes) => ({ modules, eyes })),
);

describe("qrPathData", () => {
	it("квадраты: площадь пути — ровно тёмные модули, дырки «глаз» вычитаются", () => {
		const { data, size } = encode(URL, { ecc: "M", border: 0 });
		expect(qrModules(URL)).toBe(size);
		const dark = data.flat().filter(Boolean).length;
		// сторона = size мм → модуль 1 мм
		expect(signedArea(qrPathData(URL, 0, 0, size, SQUARE))).toBeCloseTo(
			dark,
			6,
		);
	});

	it.each(ALL)(
		"модули $modules, углы $eyes: только M/L/C/Z и в пределах квадрата",
		(style) => {
			const d = qrPathData(URL, 10, 20, 30, style);
			expect(d).toMatch(/^[MLCZ\d.\s-]+$/);
			const v = numbers(d);
			const xs = v.filter((_, i) => i % 2 === 0);
			const ys = v.filter((_, i) => i % 2 === 1);
			expect(Math.min(...xs)).toBeGreaterThanOrEqual(10);
			expect(Math.max(...xs)).toBeLessThanOrEqual(40);
			expect(Math.min(...ys)).toBeGreaterThanOrEqual(20);
			expect(Math.max(...ys)).toBeLessThanOrEqual(50);
		},
	);

	it("точки — только модули данных; служебные узоры остаются квадратами", () => {
		const { data, size, types } = encode(URL, { ecc: "M", border: 0 });
		const dataModules = data
			.flatMap((row, r) => row.map((dark, c) => dark && types[r][c] === 0))
			.filter(Boolean).length;
		const contours = qrPathData(URL, 0, 0, size, {
			modules: "dots",
			eyes: "square",
		})
			.split("Z")
			.filter(Boolean);
		// у «глаз» square кривых нет — кривые только у точек
		expect(contours.filter((c) => c.includes("C"))).toHaveLength(dataModules);
		expect(contours.some((c) => !c.includes("C"))).toBe(true);
	});

	it("слишком длинный текст — исключение, render() его ловит", () => {
		expect(() => qrPathData("x".repeat(5000), 0, 0, 10, SQUARE)).toThrow();
	});
});
