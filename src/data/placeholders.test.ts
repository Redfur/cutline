import { describe, expect, it } from "vitest";
import type { CutlineDocument, CutlineElement } from "../model/document";
import { blankDocument } from "../render/fixtures/blank";
import {
	normalizeKey,
	placeholderKeys,
	renamePlaceholder,
	sampleRecord,
	substitute,
	usedFields,
} from "./placeholders";

describe("substitute", () => {
	it("подставляет несколько ключей, неизвестный — пустой строкой", () => {
		expect(
			substitute("{{city}}, {{country}}{{nope}}", {
				city: "Казань",
				country: "Россия",
			}),
		).toBe("Казань, Россия");
	});

	it("кириллица и пробелы внутри скобок", () => {
		expect(substitute("{{ ФИО }}", { ФИО: "Анна" })).toBe("Анна");
	});
});

describe("placeholderKeys / renamePlaceholder", () => {
	it("находит все ключи", () => {
		expect(placeholderKeys("ID: {{badgeId}} / {{ name }}")).toEqual([
			"badgeId",
			"name",
		]);
	});

	it("переименовывает только совпадающий ключ", () => {
		expect(
			renamePlaceholder("{{name}} {{nick}} {{ name }}", "name", "fio"),
		).toBe("{{fio}} {{nick}} {{fio}}");
	});
});

describe("usedFields", () => {
	const base = {
		name: "",
		x: 0,
		y: 0,
		w: 1,
		h: 1,
		rotation: 0,
		locked: false,
	};
	const elements: CutlineElement[] = [
		{
			...base,
			id: "a",
			type: "image",
			visible: true,
			src: "{{photo}}",
			fit: "cover",
		},
		{
			...base,
			id: "b",
			type: "rect",
			visible: true,
			fill: null,
			stroke: null,
			strokeWidth: 0,
			radius: 0,
		},
		{
			...base,
			id: "c",
			type: "image",
			visible: false,
			src: "{{hidden}}",
			fit: "cover",
		},
	];
	const doc: CutlineDocument = { ...blankDocument, elements };

	it("собирает ключи из видимых текстов и картинок", () => {
		expect([...usedFields(doc).entries()]).toEqual([["photo", ["a"]]]);
	});
});

describe("sampleRecord / normalizeKey", () => {
	it("запись из примеров полей", () => {
		expect(
			sampleRecord([{ key: "name", label: "Имя", sample: "Имя Фамилия" }]),
		).toEqual({ name: "Имя Фамилия" });
	});

	it("убирает скобки и пробелы по краям", () => {
		expect(normalizeKey(" {{Имя}} ")).toBe("Имя");
	});
});
