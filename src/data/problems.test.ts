import { describe, expect, it, vi } from "vitest";
import type {
	CutlineDocument,
	CutlineElement,
	TextElement,
} from "../model/document";
import { blankDocument } from "../render/fixtures/blank";
import { documentProblems, hasProblems, recordProblems } from "./problems";

// символ = 0.5 кегля, как в fit.test.ts
vi.mock("../render/measure", () => ({
	measureText: (text: string, sizeMm: number) => ({
		widthMm: text.length * sizeMm * 0.5,
		ascentMm: sizeMm * 0.8,
		descentMm: sizeMm * 0.2,
	}),
}));

function text(id: string, content: string, visible = true): TextElement {
	return {
		id,
		name: id,
		type: "text",
		x: 0,
		y: 0,
		// size 2 → 1мм на символ, влезает 10
		w: 10,
		h: 10,
		rotation: 0,
		locked: false,
		visible,
		content,
		font: "Inter",
		weight: "regular",
		size: 2,
		minSize: 2,
		lineHeight: 1.2,
		tracking: 0,
		align: "left",
		valign: "top",
		color: "#000",
		fit: "clip",
		transform: "none",
	};
}

function doc(elements: CutlineElement[]): CutlineDocument {
	return {
		...blankDocument,
		elements,
		fields: [
			{ key: "name", label: "Имя", sample: "" },
			{ key: "city", label: "Город", sample: "" },
			{ key: "note", label: "Заметка", sample: "" },
		],
	};
}

describe("recordProblems", () => {
	const d = doc([text("title", "{{name}}"), text("place", "{{city}}")]);

	it("всё влезло и заполнено — проблем нет", () => {
		const p = recordProblems(d, { name: "Анна", city: "Казань" });
		expect(p).toEqual({ cells: {}, overflowIds: [] });
		expect(hasProblems(p)).toBe(false);
	});

	it("пустое поле, которое есть в макете, — проблема; не используемое — нет", () => {
		const p = recordProblems(d, { name: "Анна", city: "  ", note: "" });
		expect(p.cells).toEqual({ city: "empty" });
		expect(hasProblems(p)).toBe(true);
	});

	it("переполнение помечает элемент и все его поля", () => {
		const two = doc([text("line", "{{name}}, {{city}}")]);
		const p = recordProblems(two, { name: "Анна", city: "Санкт-Петербург" });
		expect(p.overflowIds).toEqual(["line"]);
		expect(p.cells).toEqual({ name: "overflow", city: "overflow" });
	});

	it("«пусто» не перетирается «переполнением»", () => {
		const two = doc([text("line", "{{name}}{{city}}")]);
		expect(
			recordProblems(two, { name: "Константинопольская", city: "" }).cells,
		).toEqual({ name: "overflow", city: "empty" });
	});

	it("скрытые элементы не проверяются", () => {
		const hidden = doc([text("title", "{{name}}", false)]);
		expect(hasProblems(recordProblems(hidden, { name: "" }))).toBe(false);
	});

	it("плейсхолдер без колонки не даёт ячейку-проблему", () => {
		const unknown = doc([text("x", "{{nope}}{{name}}")]);
		expect(recordProblems(unknown, { name: "a".repeat(20) }).cells).toEqual({
			name: "overflow",
		});
	});
});

describe("documentProblems", () => {
	it("по записи на индекс", () => {
		const d = {
			...doc([text("title", "{{name}}")]),
			records: [{ name: "Анна" }, { name: "" }],
		};
		expect(documentProblems(d).map(hasProblems)).toEqual([false, true]);
	});
});
