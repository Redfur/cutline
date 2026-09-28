import { describe, expect, it, vi } from "vitest";
import {
	type BlockRules,
	clipToFit,
	type FitContext,
	fitBlock,
	fitLine,
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
	return { fontFamily: "Inter", weight: 400, trackingMm, maxWidthMm };
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
	// size 2 → 1 мм на символ
	it("переносит по словам", () => {
		expect(wrapToFit("aaa bbb ccc dd", 2, ctx(7))).toEqual([
			"aaa bbb",
			"ccc dd",
		]);
	});

	it("слово шире строки режется по символам", () => {
		expect(wrapToFit("aa bbbbbbbbbb cc", 2, ctx(5))).toEqual([
			"aa",
			"bbbbb",
			"bbbbb",
			"cc",
		]);
	});

	it("ручные переносы — отдельные абзацы, пустая строка сохраняется", () => {
		expect(wrapToFit("aa bb\n\ncc", 2, ctx(10))).toEqual(["aa bb", "", "cc"]);
	});

	it("одни пробелы — одна пустая строка", () => {
		expect(wrapToFit("   ", 2, ctx(5))).toEqual([""]);
	});
});

describe("clipToFit", () => {
	it("хвостовой пробел перед многоточием убирается", () => {
		// «abc d…» не влезает в 5, «abc …» → «abc…»
		expect(clipToFit("abc def", 2, ctx(5))).toBe("abc…");
	});
});

const noRules = { shrink: false, ellipsis: false, minSizeMm: 1 };

describe("fitLine", () => {
	it("без правил — как есть, шире рамки — переполнение", () => {
		expect(fitLine("abcd", 2, noRules, ctx(4))).toEqual({
			sizeMm: 2,
			lines: ["abcd"],
			overflow: false,
		});
		expect(fitLine("abcdefgh", 2, noRules, ctx(4)).overflow).toBe(true);
	});

	it("уменьшить: влезло на меньшем кегле — не переполнение", () => {
		const r = fitLine("abcdefgh", 2, { ...noRules, shrink: true }, ctx(4));
		expect(r.sizeMm).toBe(1);
		expect(r.overflow).toBe(false);
	});

	it("многоточие: обрезано — переполнение", () => {
		expect(
			fitLine("abcdefgh", 2, { ...noRules, ellipsis: true }, ctx(4)),
		).toEqual({ sizeMm: 2, lines: ["abc…"], overflow: true });
	});

	it("вместе: сначала уменьшаем до минимума, потом обрезаем", () => {
		// на минимуме 1: 0.5 мм на символ, в 2 мм — «abc…»
		expect(
			fitLine(
				"abcdefgh",
				2,
				{ shrink: true, ellipsis: true, minSizeMm: 1 },
				ctx(2),
			),
		).toEqual({ sizeMm: 1, lines: ["abc…"], overflow: true });
	});
});

function block(patch: Partial<BlockRules>): BlockRules {
	return {
		...noRules,
		maxLines: null,
		heightMm: 100,
		lineHeight: 1.25,
		...patch,
	};
}

describe("fitBlock", () => {
	it("влезло в высоту — строки как есть", () => {
		expect(fitBlock("aa bb\ncc", 2, block({}), ctx(5))).toEqual({
			sizeMm: 2,
			lines: ["aa bb", "cc"],
			overflow: false,
		});
	});

	it("без лимита строк — лимит по высоте рамки (строка 2.5 мм)", () => {
		const three = "aa\nbb\ncc";
		expect(fitBlock(three, 2, block({ heightMm: 7.5 }), ctx(5)).overflow).toBe(
			false,
		);
		expect(fitBlock(three, 2, block({ heightMm: 7 }), ctx(5)).overflow).toBe(
			true,
		);
	});

	it("одна строка в низкой рамке — не переполнение", () => {
		expect(fitBlock("aa", 2, block({ heightMm: 1 }), ctx(5)).overflow).toBe(
			false,
		);
	});

	it("лимит строк без многоточия — все строки и переполнение", () => {
		const r = fitBlock("aa bb cc", 2, block({ maxLines: 2 }), ctx(2));
		expect(r.lines).toEqual(["aa", "bb", "cc"]);
		expect(r.overflow).toBe(true);
	});

	it("многоточие — в конце последней разрешённой строки", () => {
		const r = fitBlock(
			"aaa bbb ccc",
			2,
			block({ maxLines: 2, ellipsis: true }),
			ctx(4),
		);
		expect(r.lines).toEqual(["aaa", "bbb…"]);
		expect(r.overflow).toBe(true);
	});

	it("лимит на пустой строке — многоточие у последней непустой", () => {
		const r = fitBlock(
			"aaa\n\nbbb",
			2,
			block({ maxLines: 2, ellipsis: true }),
			ctx(10),
		);
		expect(r.lines).toEqual(["aaa…"]);
	});

	it("уменьшить: кегль падает, пока текст не войдёт в лимит строк", () => {
		// на 2: «aaa bbb» — 7 мм > 4, три строки; на 1: 3.5 мм — строка «aaa bbb», две строки
		const r = fitBlock(
			"aaa bbb ccc",
			2,
			block({ maxLines: 2, shrink: true, minSizeMm: 0.5 }),
			ctx(4),
		);
		expect(r.lines.length).toBeLessThanOrEqual(2);
		expect(r.sizeMm).toBeLessThan(2);
		expect(r.overflow).toBe(false);
	});
});
