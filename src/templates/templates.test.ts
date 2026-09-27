import { describe, expect, it } from "vitest";
import { usedFields } from "../data/placeholders";
import { isBundledFont } from "../fonts/bundled";
import { validateDocument } from "../model/file";
import { documentFromTemplate, TEMPLATES } from "./templates";

describe("шаблоны", () => {
	it("четыре шаблона макета: бейдж, карточка гостя, ценник, визитка", () => {
		expect(TEMPLATES.map((t) => t.name)).toEqual([
			"Бейдж участника",
			"Карточка гостя",
			"Ценник",
			"Визитка",
		]);
	});

	it.each(TEMPLATES)("$name — валидный документ текущей схемы", (t) => {
		expect(validateDocument(t.doc)).toEqual(t.doc);
	});

	it.each(TEMPLATES)(
		"$name — только встроенные шрифты: шаблон сразу экспортируется в PDF",
		(t) => {
			for (const el of t.doc.elements) {
				if (el.type === "text") expect(isBundledFont(el.font)).toBe(true);
			}
		},
	);

	it.each(TEMPLATES)("$name — каждый плейсхолдер есть среди полей", (t) => {
		const keys = t.doc.fields.map((f) => f.key);
		for (const key of usedFields(t.doc).keys()) expect(keys).toContain(key);
	});

	it("единицы макета переведены: 24 pt → мм, 105% → 1,05, трекинг 4% кегля → мм", () => {
		const badge = TEMPLATES[0].doc;
		const name = badge.elements.find((el) => el.name === "Имя");
		const date = badge.elements.find((el) => el.name === "Дата");
		if (name?.type !== "text" || date?.type !== "text") throw new Error();
		// точный pt = 25,4/72 мм; в макете округлённое 0,3528 — разница в десятитысячных
		expect(name.size).toBeCloseTo((24 * 25.4) / 72, 9);
		expect(name.lineHeight).toBeCloseTo(1.05, 9);
		expect(name.weight).toBe("bold");
		expect(date.tracking).toBeCloseTo(((9 * 25.4) / 72) * 0.04, 9);
	});

	it("верхний слой макета — последний в модели (рисуется поверх)", () => {
		const { elements } = TEMPLATES[0].doc;
		expect(elements[0].name).toBe("Полоса");
		expect(elements.at(-1)?.name).toBe("Дата");
	});

	it("документ из шаблона — копия со своими id элементов", () => {
		const a = documentFromTemplate(TEMPLATES[2]);
		const b = documentFromTemplate(TEMPLATES[2]);
		expect(a.name).toBe("Ценник");
		expect(a.elements.map((el) => el.id)).not.toEqual(
			b.elements.map((el) => el.id),
		);
		a.records[0].Цена = "1";
		expect(TEMPLATES[2].doc.records[0].Цена).toBe("640");
	});
});
