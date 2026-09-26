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

	it("уменьшает до кегля, при котором влезает", () => {
		// 10 символов × size × 0.5 ≤ 20 → size ≤ 4
		expect(shrinkToFit("abcdefghij", 5, 2, ctx(20))).toBe(4);
	});

	it("за много шагов не копит ошибку float", () => {
		// 67 шагов по 0.1: без округления выходило 3.2000000000000206 — на шаг
		// мельче нужного и с хвостом, который попадал в font-size SVG
		// 10 символов × size × 0.5 ≤ 16.5 → size ≤ 3.3
		expect(shrinkToFit("abcdefghij", 10, 1, ctx(16.5))).toBe(3.3);
	});

	it("кегль не по сетке шага уменьшается от себя, а не прыгает на сетку", () => {
		// 10 × size × 0.5 ≤ 20.75 → size ≤ 4.15
		expect(shrinkToFit("abcdefghij", 4.25, 2, ctx(20.75))).toBe(4.15);
	});

	it("не опускается ниже минимума", () => {
		expect(shrinkToFit("abcdefghij", 5, 3, ctx(5))).toBe(3);
	});

	it("учитывает трекинг", () => {
		// 4 × 0.5·size + 3 × 1 ≤ 9 → size ≤ 3
		expect(shrinkToFit("abcd", 5, 1, ctx(9, 1))).toBe(3);
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
