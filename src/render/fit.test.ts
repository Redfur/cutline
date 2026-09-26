import { describe, expect, it, vi } from "vitest";
import {
	applyFit,
	clipToFit,
	type FitContext,
	shrinkToFit,
	wrapToFit,
} from "./fit";

// настоящий measure.ts меряет через canvas — здесь моноширинная модель: каждый
// символ 0.5 кегля, чтобы ожидаемые ширины считались в уме
vi.mock("./measure", () => ({
	measureText: (text: string, sizeMm: number, trackingMm: number) => ({
		widthMm:
			text.length * sizeMm * 0.5 +
			(text.length > 1 ? trackingMm * (text.length - 1) : 0),
		ascentMm: sizeMm * 0.8,
		descentMm: sizeMm * 0.2,
	}),
}));

function ctx(maxWidthMm: number, trackingMm = 0): FitContext {
	return { fontFamily: "Inter", weight: "regular", trackingMm, maxWidthMm };
}

describe("shrinkToFit", () => {
	it("не трогает кегль, если текст влезает", () => {
		expect(shrinkToFit("abcd", 5, 2, ctx(10))).toBe(5);
	});

	// Шаг 0.1 копится во float (5 − 10×0.1 = 4.0000000000000036), поэтому граничный
	// кегль иногда проскакивается на один шаг — проверяем «влезает и не мельче шага»,
	// а не точное значение
	it("уменьшает до кегля, при котором влезает", () => {
		// 10 символов × size × 0.5 ≤ 20 → size ≤ 4
		const size = shrinkToFit("abcdefghij", 5, 2, ctx(20));
		expect(size).toBeLessThanOrEqual(4);
		expect(size).toBeGreaterThan(3.85);
	});

	it("не опускается ниже минимума", () => {
		expect(shrinkToFit("abcdefghij", 5, 3, ctx(5))).toBe(3);
	});

	it("учитывает трекинг", () => {
		// 4 × 0.5·size + 3 × 1 ≤ 9 → size ≤ 3
		const size = shrinkToFit("abcd", 5, 1, ctx(9, 1));
		expect(size).toBeLessThanOrEqual(3);
		expect(size).toBeGreaterThan(2.85);
	});
});

describe("clipToFit", () => {
	it("влезающий текст не обрезает", () => {
		expect(clipToFit("abcd", 2, ctx(4))).toBe("abcd");
	});

	it("обрезает с многоточием, многоточие тоже учитывается в ширине", () => {
		// size 2 → 1мм на символ, ширина 4 → 3 символа + «…»
		expect(clipToFit("abcdefgh", 2, ctx(4))).toBe("abc…");
	});

	it("оставляет хотя бы один символ", () => {
		expect(clipToFit("abcdefgh", 2, ctx(0.5))).toBe("a…");
	});
});

describe("wrapToFit", () => {
	it("переносит по словам", () => {
		// 1мм на символ, ширина 7
		expect(wrapToFit("aaa bbb ccc dd", 2, ctx(7))).toEqual([
			"aaa bbb",
			"ccc dd",
		]);
	});

	it("слово длиннее строки остаётся целиком на своей строке", () => {
		expect(wrapToFit("aa bbbbbbbbbb cc", 2, ctx(5))).toEqual([
			"aa",
			"bbbbbbbbbb",
			"cc",
		]);
	});

	it("пустой текст — одна пустая строка", () => {
		expect(wrapToFit("   ", 2, ctx(5))).toEqual([""]);
	});
});

describe("applyFit", () => {
	it("shrink: ужимает, а если и на минимуме не влезло — обрезает", () => {
		expect(applyFit("abcdefgh", "shrink", 4, 2, ctx(4))).toEqual({
			sizeMm: 2,
			lines: ["abc…"],
		});
	});

	it("clip: кегль не меняет", () => {
		expect(applyFit("abcdefgh", "clip", 2, 1, ctx(4))).toEqual({
			sizeMm: 2,
			lines: ["abc…"],
		});
	});

	it("wrap: строки из wrapToFit", () => {
		expect(applyFit("aaa bbb", "wrap", 2, 1, ctx(4)).lines).toEqual([
			"aaa",
			"bbb",
		]);
	});

	it("none: текст как есть", () => {
		expect(applyFit("abcdefgh", "none", 2, 1, ctx(1))).toEqual({
			sizeMm: 2,
			lines: ["abcdefgh"],
		});
	});
});
