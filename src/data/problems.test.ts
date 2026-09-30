import { describe, expect, it, vi } from "vitest";
import type {
	CutlineDocument,
	CutlineElement,
	DataRecord,
	RectElement,
	TextElement,
} from "../model/document";
import { DEFAULT_QR_STYLE } from "../model/migrate";
import { blankDocument } from "../render/fixtures/blank";
import {
	documentProblems,
	hasProblems,
	imageHrefs,
	recordProblems,
} from "./problems";

const at = (record: DataRecord) => ({ record, n: 1 });

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
		condition: null,
		content,
		font: "Inter",
		weight: 400,
		size: 2,
		minSize: 2,
		lineHeight: 1.2,
		tracking: 0,
		align: "left",
		valign: "top",
		color: "#000",
		mode: "line",
		shrink: false,
		ellipsis: true,
		maxLines: null,
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
		const p = recordProblems(d, at({ name: "Анна", city: "Казань" }));
		expect(p).toEqual({ cells: {}, overflowIds: [], errors: [] });
		expect(hasProblems(p)).toBe(false);
	});

	it("пустое поле, которое есть в макете, — проблема; не используемое — нет", () => {
		const p = recordProblems(d, at({ name: "Анна", city: "  ", note: "" }));
		expect(p.cells).toEqual({ city: "empty" });
		expect(hasProblems(p)).toBe(true);
	});

	it("переполнение помечает элемент и все его поля", () => {
		const two = doc([text("line", "{{name}}, {{city}}")]);
		const p = recordProblems(
			two,
			at({ name: "Анна", city: "Санкт-Петербург" }),
		);
		expect(p.overflowIds).toEqual(["line"]);
		expect(p.cells).toEqual({ name: "overflow", city: "overflow" });
	});

	it("«пусто» не перетирается «переполнением»", () => {
		const two = doc([text("line", "{{name}}{{city}}")]);
		expect(
			recordProblems(two, at({ name: "Константинопольская", city: "" })).cells,
		).toEqual({ name: "overflow", city: "empty" });
	});

	it("скрытые элементы не проверяются", () => {
		const hidden = doc([text("title", "{{name}}", false)]);
		expect(hasProblems(recordProblems(hidden, at({ name: "" })))).toBe(false);
	});

	it("плейсхолдер без колонки не даёт ячейку-проблему", () => {
		const unknown = doc([text("x", "{{nope}}{{name}}")]);
		expect(recordProblems(unknown, at({ name: "a".repeat(20) })).cells).toEqual(
			{
				name: "overflow",
			},
		);
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

describe("функции в плейсхолдерах", () => {
	it("поле в первом аргументе default() не обязательное", () => {
		const d = doc([text("note", '{{ default(note, "Гость") }}')]);
		expect(recordProblems(d, at({ note: "" })).cells).toEqual({});
	});

	it("во втором аргументе default() — обязательное, как обычно", () => {
		const d = doc([text("note", "{{ default(note, name) }}")]);
		expect(recordProblems(d, at({ note: "", name: "" })).cells).toEqual({
			name: "empty",
		});
	});

	it("ошибка значения — проблема записи и ячейка аргумента", () => {
		const d = doc([text("price", "{{ num(note) }}")]);
		const p = recordProblems(d, at({ note: "дорого" }));
		expect(p.cells).toEqual({ note: "error" });
		expect(p.errors).toEqual([
			{ elementId: "price", message: "num(): «дорого» — не число" },
		]);
		expect(hasProblems(p)).toBe(true);
	});

	it("ошибка шаблона (нет такой функции) — не проблема каждой записи", () => {
		const d = doc([text("x", "{{ nope(name) }}")]);
		expect(recordProblems(d, at({ name: "Анна" })).errors).toEqual([]);
	});

	it("n() в documentProblems — номер записи", () => {
		const d = {
			...doc([text("n", "{{ pad(n(), 3) }}")]),
			records: [{}, {}],
		};
		expect(documentProblems(d).every((p) => !hasProblems(p))).toBe(true);
	});
});

describe("картинки, которые не загрузились", () => {
	const img: CutlineElement = {
		id: "photo",
		name: "Фото",
		type: "image",
		x: 0,
		y: 0,
		w: 10,
		h: 10,
		rotation: 0,
		locked: false,
		visible: true,
		condition: null,
		src: "https://x.example/{{note}}.png",
		fit: "cover",
		background: null,
		qr: DEFAULT_QR_STYLE,
	};
	const d = { ...doc([img]), records: [{ note: "a" }, { note: "b" }] };

	it("ссылки по всем записям; без записей — по примеру", () => {
		expect(imageHrefs(d, {})).toEqual(
			new Set(["https://x.example/a.png", "https://x.example/b.png"]),
		);
		expect(imageHrefs({ ...d, records: [] }, { note: "z" })).toEqual(
			new Set(["https://x.example/z.png"]),
		);
	});

	it("сломанная — проблема записи и ячейка поля из ссылки", () => {
		const broken = new Set(["https://x.example/b.png"]);
		const [a, b] = documentProblems(d, broken);
		expect(hasProblems(a)).toBe(false);
		expect(b.cells).toEqual({ note: "broken" });
		expect(b.errors[0].message).toBe(
			"Картинка не загрузилась: https://x.example/b.png",
		);
	});
});

describe("заполнение по данным", () => {
	const bar: RectElement = {
		id: "bar",
		name: "bar",
		type: "rect",
		x: 0,
		y: 0,
		w: 10,
		h: 2,
		rotation: 0,
		locked: false,
		visible: true,
		condition: null,
		fill: "#000",
		stroke: null,
		strokeWidth: 0,
		radius: 0,
		progress: { value: "{{note}}", direction: "right" },
	};

	it("пустое значение — «пусто», не число — ошибка ячейки", () => {
		expect(recordProblems(doc([bar]), at({ note: "" })).cells).toEqual({
			note: "empty",
		});
		const p = recordProblems(doc([bar]), at({ note: "много" }));
		expect(p.cells).toEqual({ note: "error" });
		expect(p.errors).toEqual([
			{ elementId: "bar", message: "Заполнение: «много» — не число" },
		]);
		expect(hasProblems(recordProblems(doc([bar]), at({ note: "40" })))).toBe(
			false,
		);
	});
});

describe("условие показа", () => {
	const onlyIfCity = (el: TextElement): TextElement => ({
		...el,
		condition: { value: "{{city}}", when: "filled" },
	});

	it("скрытый условием: пустое поле, переполнение и ошибки не проверяются", () => {
		const d = doc([
			onlyIfCity(text("a", "{{city}}")),
			onlyIfCity(text("b", "очень длинный текст {{ num(note) }}")),
		]);
		const p = recordProblems(d, at({ city: "", note: "абв" }));
		expect(p).toEqual({ cells: {}, overflowIds: [], errors: [] });
	});

	it("показанный — проверяется как обычно", () => {
		const d = doc([onlyIfCity(text("b", "{{name}} очень длинный текст"))]);
		const p = recordProblems(d, at({ city: "Казань", name: "" }));
		expect(p.cells.name).toBe("empty");
		expect(p.overflowIds).toEqual(["b"]);
	});

	it("поле только в условии не обязательное", () => {
		const d = doc([onlyIfCity(text("a", "Гость"))]);
		expect(hasProblems(recordProblems(d, at({ city: "" })))).toBe(false);
	});

	it("пустота нужна и другому, показанному элементу — проблема", () => {
		const d = doc([onlyIfCity(text("a", "{{name}}")), text("b", "{{name}}")]);
		expect(recordProblems(d, at({ city: "", name: "" })).cells.name).toBe(
			"empty",
		);
	});

	it("ошибка функции в условии — проблема записи", () => {
		const el: TextElement = {
			...text("a", "Гость"),
			condition: { value: "{{ num(note) }}", when: "filled" },
		};
		const p = recordProblems(doc([el]), at({ note: "абв" }));
		expect(p.cells.note).toBe("error");
		expect(p.errors).toHaveLength(1);
	});
});
