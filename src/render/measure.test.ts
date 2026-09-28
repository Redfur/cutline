import { beforeAll, describe, expect, it } from "vitest";

// В node нет canvas — подсовываем фейковый 2D-контекст до первого вызова measureText
// (он кеширует контекст в модуле) и смотрим, какую строку font ему выставили.
const fonts: string[] = [];
// метрики — целыми px от текущего кегля, как у Chromium: ascent 0.8, descent 0.2 кегля
let currentPx = 0;
const fakeContext = {
	set font(value: string) {
		fonts.push(value);
		currentPx = Number.parseFloat(value.split(" ")[1]);
	},
	measureText: (text: string) => ({
		width: text.length * 2,
		fontBoundingBoxAscent: Math.round(currentPx * 0.8),
		fontBoundingBoxDescent: Math.round(currentPx * 0.2),
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
		measureText("a", 4, 0, "sans-serif", 400);
		measureText("a", 4, 0, "Inter", 400);
		// у каждого вызова два шрифта: опорный для метрик и настоящий для ширины
		expect(fonts.slice(-4)).toEqual([
			"400 1000px sans-serif",
			"400 4px sans-serif",
			'400 1000px "Inter"',
			'400 4px "Inter"',
		]);
	});

	it("bold → 700", () => {
		measureText("a", 3.5, 0, "Inter", 700);
		expect(fonts.at(-1)).toBe('700 3.5px "Inter"');
	});

	it("трекинг добавляется между символами, не после последнего", () => {
		expect(measureText("abcd", 4, 0.5, "Inter", 400).widthMm).toBe(8 + 3 * 0.5);
		expect(measureText("a", 4, 0.5, "Inter", 400).widthMm).toBe(2);
	});

	it("системный шрифт: метрики с опорного кегля, без округления до целых", () => {
		const m = measureText("a", 4.3, 0, "Inter", 400);
		expect(m.ascentMm).toBeCloseTo(4.3 * 0.8, 6);
		expect(m.descentMm).toBeCloseTo(4.3 * 0.2, 6);
	});

	it("базовая линия растёт с кеглем плавно, без ступенек", () => {
		const ascents = [3, 3.1, 3.2, 3.3].map(
			(size) => measureText("a", size, 0, "Inter", 400).ascentMm,
		);
		const steps = ascents.slice(1).map((a, i) => a - ascents[i]);
		for (const step of steps) expect(step).toBeCloseTo(0.08, 6);
	});

	it("встроенный шрифт: метрики из таблицы файла", () => {
		expect(measureText("a", 10, 0, "Golos Text", 400)).toMatchObject({
			ascentMm: 9.8,
			descentMm: 2.2,
		});
	});
});
