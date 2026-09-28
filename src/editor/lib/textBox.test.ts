import { describe, expect, it } from "vitest";
import type { TextElement } from "../../model/document";
import { createRect, createText } from "./createElement";
import { normalizeElement, normalizeText } from "./textBox";

// строка — 5 мм: кегль 4 × межстрочный 1.25
function block(patch: Partial<TextElement> = {}): TextElement {
	return {
		...createText({ x: 0, y: 0 }),
		x: 0,
		y: 10,
		w: 40,
		h: 10,
		size: 4,
		lineHeight: 1.25,
		mode: "block",
		maxLines: 2,
		...patch,
	};
}

describe("normalizeText", () => {
	it("строка и блок без лимита — как есть", () => {
		const line = block({ mode: "line", h: 7 });
		expect(normalizeText(null, line)).toBe(line);
		const free = block({ maxLines: null, h: 7 });
		expect(normalizeText(null, free)).toBe(free);
	});

	it("лимит, кегль, межстрочный → высота на строки", () => {
		const prev = block();
		expect(normalizeText(prev, { ...prev, maxLines: 3 }).h).toBe(15);
		expect(normalizeText(prev, { ...prev, size: 8 }).h).toBe(20);
		expect(normalizeText(prev, { ...prev, lineHeight: 1.5 }).h).toBe(12);
	});

	it("потянули высоту — лимит строк следует, рамка встаёт на строки", () => {
		const prev = block();
		const next = normalizeText(prev, { ...prev, h: 16.4 });
		expect(next.maxLines).toBe(3);
		expect(next.h).toBe(15);
		expect(next.y).toBe(10);
	});

	it("тянули верхний край — нижний на месте", () => {
		const prev = block();
		// верх с 10 до 3.6: h 16.4 → 3 строки, 15 мм, низ на 20
		const next = normalizeText(prev, { ...prev, y: 3.6, h: 16.4 });
		expect(next.h).toBe(15);
		expect(next.y).toBe(5);
	});

	it("меньше одной строки не бывает", () => {
		const prev = block();
		expect(normalizeText(prev, { ...prev, h: 1 }).maxLines).toBe(1);
	});

	it("не текст — без изменений", () => {
		const rect = createRect({ x: 0, y: 0 });
		expect(normalizeElement(null, rect)).toBe(rect);
	});
});
