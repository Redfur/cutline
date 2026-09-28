import { describe, expect, it, vi } from "vitest";
import type { DataRecord, TextElement } from "../model/document";
import { firstBaselineY, layoutText } from "./layout";

const at = (record: DataRecord) => ({ record, n: 1 });

// та же моноширинная модель, что в fit.test.ts: символ = 0.5 кегля
vi.mock("./measure", () => ({
	measureText: (text: string, sizeMm: number) => ({
		widthMm: text.length * sizeMm * 0.5,
		ascentMm: sizeMm * 0.8,
		descentMm: sizeMm * 0.2,
	}),
}));

function text(patch: Partial<TextElement>): TextElement {
	return {
		id: "t",
		name: "Текст",
		type: "text",
		x: 0,
		y: 0,
		w: 10,
		h: 10,
		rotation: 0,
		locked: false,
		visible: true,
		content: "{{name}}",
		font: "Inter",
		weight: 400,
		size: 2,
		minSize: 1,
		lineHeight: 1.25,
		tracking: 0,
		align: "left",
		valign: "top",
		color: "#000",
		mode: "line",
		shrink: false,
		ellipsis: false,
		maxLines: null,
		transform: "none",
		...patch,
	};
}

// size 2 → 1мм на символ, w 10 → 10 символов влезает
describe("layoutText", () => {
	it("пустое поле — рисовать нечего", () => {
		expect(layoutText(text({}), at({ name: "" }))).toBeNull();
		expect(layoutText(text({}), at({}))).toBeNull();
	});

	it("подставляет запись и применяет регистр до подгонки", () => {
		const layout = layoutText(
			text({ transform: "upper" }),
			at({ name: "anna" }),
		);
		expect(layout?.lines).toEqual(["ANNA"]);
		expect(layout?.overflow).toBe(false);
	});

	it("без правил: шире рамки — переполнение", () => {
		expect(layoutText(text({}), at({ name: "a".repeat(10) }))?.overflow).toBe(
			false,
		);
		expect(layoutText(text({}), at({ name: "a".repeat(11) }))?.overflow).toBe(
			true,
		);
	});

	it("уменьшать: ужалось и влезло — не проблема, не влезло и на минимуме — проблема", () => {
		// 15 символов × size × 0.5 ≤ 10 → size ≤ 1.33, минимум 1 — влезает
		const shrunk = layoutText(
			text({ shrink: true, ellipsis: true }),
			at({
				name: "a".repeat(15),
			}),
		);
		expect(shrunk?.overflow).toBe(false);
		expect(shrunk?.sizeMm).toBeLessThan(2);
		// 30 символов на минимуме 1 → 15мм > 10
		expect(
			layoutText(
				text({ shrink: true, ellipsis: true }),
				at({ name: "a".repeat(30) }),
			)?.overflow,
		).toBe(true);
	});

	it("многоточие: обрезано — переполнение", () => {
		const layout = layoutText(
			text({ ellipsis: true }),
			at({ name: "a".repeat(12) }),
		);
		expect(layout?.lines[0]?.endsWith("…")).toBe(true);
		expect(layout?.overflow).toBe(true);
	});

	it("блок без лимита: строк больше, чем вмещает высота", () => {
		// строка 2.5мм; h 10 вмещает 4 строки
		const four = "aaaa bbbb cccc dddd";
		expect(
			layoutText(text({ mode: "block", w: 5 }), at({ name: four }))?.overflow,
		).toBe(false);
		expect(
			layoutText(text({ mode: "block", w: 5 }), at({ name: `${four} eeee` }))
				?.overflow,
		).toBe(true);
	});

	it("блок: слово шире рамки режется по символам", () => {
		const layout = layoutText(
			text({ mode: "block", w: 5 }),
			at({ name: "aaaaaaaa" }),
		);
		expect(layout?.lines).toEqual(["aaaaa", "aaa"]);
		expect(layout?.overflow).toBe(false);
	});

	it("блок: ручные переносы из данных, \\r\\n тоже", () => {
		expect(
			layoutText(text({ mode: "block" }), at({ name: "Анна\r\nСоколова" }))
				?.lines,
		).toEqual(["Анна", "Соколова"]);
	});

	it("строка: перенос из данных — пробел", () => {
		expect(layoutText(text({}), at({ name: "Анна\nСоколова" }))?.lines).toEqual(
			["Анна Соколова"],
		);
	});

	it("блок: лимит строк и многоточие", () => {
		const layout = layoutText(
			text({ mode: "block", w: 5, maxLines: 2, ellipsis: true }),
			at({ name: "aaaa bbbb cccc" }),
		);
		expect(layout?.lines).toEqual(["aaaa", "bbbb…"]);
		expect(layout?.overflow).toBe(true);
	});
});

// кегль 10: ascent 8, descent 2, межстрочный 12
const metrics = { lineHeightMm: 12, ascentMm: 8, descentMm: 2 };
const one = { ...metrics, lines: ["a"] };
const three = { ...metrics, lines: ["a", "b", "c"] };

describe("firstBaselineY", () => {
	it("по верху — верх строки на верхнем крае рамки", () => {
		expect(firstBaselineY("top", 0, 40, one)).toBe(8);
	});

	it("по центру — центр строки в центре рамки, а не верх", () => {
		// строка 10 мм (8+2) в рамке 40: верх на 15, базовая на 23
		const base = firstBaselineY("middle", 0, 40, one);
		expect(base).toBe(23);
		const top = base - metrics.ascentMm;
		const bottom = base + metrics.descentMm;
		expect((top + bottom) / 2).toBe(20);
	});

	it("по базовой — базовая последней строки на нижнем крае рамки", () => {
		expect(firstBaselineY("baseline", 0, 40, one)).toBe(40);
		// три строки: первая на 40 − 12·2
		expect(firstBaselineY("baseline", 0, 40, three)).toBe(16);
	});

	it("по центру, три строки — центрируется весь блок", () => {
		// блок 8 + 2 + 12·2 = 34 мм: верх на 3, первая базовая на 11
		const base = firstBaselineY("middle", 0, 40, three);
		expect(base).toBe(11);
		const top = base - metrics.ascentMm;
		const bottom = base + 24 + metrics.descentMm;
		expect((top + bottom) / 2).toBe(20);
	});
});
