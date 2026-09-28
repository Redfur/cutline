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

// кегль 10: ascent 8, descent 2, межстрочный 12 — в строке-коробке по 1 мм сверху и снизу
const metrics = { lineHeightMm: 12, ascentMm: 8, descentMm: 2 };
const one = { ...metrics, lines: ["a"] };
const three = { ...metrics, lines: ["a", "b", "c"] };

describe("firstBaselineY — строки-коробки, как в Фигме", () => {
	it("буквы по центру строки при любом межстрочном", () => {
		// рамка = строка: верх букв на 1, низ на 11
		expect(firstBaselineY("top", 0, 12, one)).toBe(9);
		// межстрочный 20: лишнее 10 мм поровну — верх букв на 5
		expect(firstBaselineY("top", 0, 20, { ...one, lineHeightMm: 20 })).toBe(13);
		// межстрочный меньше букв — буквы вылезают поровну
		expect(firstBaselineY("top", 0, 8, { ...one, lineHeightMm: 8 })).toBe(7);
	});

	it("рамка ровно по строкам — выравнивание ничего не меняет", () => {
		for (const valign of ["top", "middle", "bottom"] as const) {
			expect(firstBaselineY(valign, 0, 36, three)).toBe(9);
		}
	});

	it("рамка выше строк — по верху, по центру, по низу", () => {
		// содержимое 36 в рамке 40
		expect(firstBaselineY("top", 0, 40, three)).toBe(9);
		expect(firstBaselineY("middle", 0, 40, three)).toBe(11);
		expect(firstBaselineY("bottom", 0, 40, three)).toBe(13);
	});
});
