import { beforeAll, describe, expect, it } from "vitest";

// В node нет canvas — подсовываем фейковый 2D-контекст до первого вызова measureText
// (он кеширует контекст в модуле) и смотрим, какую строку font ему выставили.
const fonts: string[] = [];
const fakeContext = {
	set font(value: string) {
		fonts.push(value);
	},
	measureText: (text: string) => ({
		width: text.length * 2,
		fontBoundingBoxAscent: 8,
		fontBoundingBoxDescent: 2,
	}),
};

beforeAll(() => {
	Object.assign(globalThis, {
		document: { createElement: () => ({ getContext: () => fakeContext }) },
	});
});

const { measureText } = await import("./measure");

describe("measureText", () => {
	it("родовое семейство — без кавычек, конкретное — в кавычках", () => {
		measureText("a", 4, 0, "sans-serif", "regular");
		measureText("a", 4, 0, "Inter", "regular");
		expect(fonts.slice(-2)).toEqual(["400 4px sans-serif", '400 4px "Inter"']);
	});

	it("bold → 700", () => {
		measureText("a", 3.5, 0, "Inter", "bold");
		expect(fonts.at(-1)).toBe('700 3.5px "Inter"');
	});

	it("трекинг добавляется между символами, не после последнего", () => {
		expect(measureText("abcd", 4, 0.5, "Inter", "regular").widthMm).toBe(
			8 + 3 * 0.5,
		);
		expect(measureText("a", 4, 0.5, "Inter", "regular").widthMm).toBe(2);
	});

	it("отдаёт метрики шрифта", () => {
		expect(measureText("a", 4, 0, "Inter", "regular")).toMatchObject({
			ascentMm: 8,
			descentMm: 2,
		});
	});
});
