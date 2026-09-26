import { describe, expect, it, vi } from "vitest";
import type { TextElement } from "../model/document";
import { layoutText } from "./layout";

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
		weight: "regular",
		size: 2,
		minSize: 1,
		lineHeight: 1.25,
		tracking: 0,
		align: "left",
		valign: "top",
		color: "#000",
		fit: "none",
		transform: "none",
		...patch,
	};
}

// size 2 → 1мм на символ, w 10 → 10 символов влезает
describe("layoutText", () => {
	it("пустое поле — рисовать нечего", () => {
		expect(layoutText(text({}), { name: "" })).toBeNull();
		expect(layoutText(text({}), {})).toBeNull();
	});

	it("подставляет запись и применяет регистр до подгонки", () => {
		const layout = layoutText(text({ transform: "upper" }), { name: "anna" });
		expect(layout?.lines).toEqual(["ANNA"]);
		expect(layout?.overflow).toBe(false);
	});

	it("none: шире рамки — переполнение", () => {
		expect(layoutText(text({}), { name: "a".repeat(10) })?.overflow).toBe(
			false,
		);
		expect(layoutText(text({}), { name: "a".repeat(11) })?.overflow).toBe(true);
	});

	it("shrink: ужалось и влезло — не проблема, не влезло и на минимуме — проблема", () => {
		// 15 символов × size × 0.5 ≤ 10 → size ≤ 1.33, минимум 1 — влезает
		const shrunk = layoutText(text({ fit: "shrink" }), {
			name: "a".repeat(15),
		});
		expect(shrunk?.overflow).toBe(false);
		expect(shrunk?.sizeMm).toBeLessThan(2);
		// 30 символов на минимуме 1 → 15мм > 10
		expect(
			layoutText(text({ fit: "shrink" }), { name: "a".repeat(30) })?.overflow,
		).toBe(true);
	});

	it("clip: обрезано — переполнение", () => {
		const layout = layoutText(text({ fit: "clip" }), { name: "a".repeat(12) });
		expect(layout?.lines[0]?.endsWith("…")).toBe(true);
		expect(layout?.overflow).toBe(true);
	});

	it("wrap: строк больше, чем вмещает высота", () => {
		// строка 2.5мм; h 10 вмещает 4 строки
		const four = "aaaa bbbb cccc dddd";
		expect(
			layoutText(text({ fit: "wrap", w: 5 }), { name: four })?.overflow,
		).toBe(false);
		expect(
			layoutText(text({ fit: "wrap", w: 5 }), { name: `${four} eeee` })
				?.overflow,
		).toBe(true);
	});

	it("wrap: слово шире рамки — переполнение даже в одну строку", () => {
		expect(
			layoutText(text({ fit: "wrap", w: 5 }), { name: "aaaaaaaa" })?.overflow,
		).toBe(true);
	});
});
