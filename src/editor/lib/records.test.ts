import { describe, expect, it } from "vitest";
import { NEW_FIELD, SKIP, toTable } from "../../data/csv";
import type { CutlineDocument } from "../../model/document";
import { blankDocument } from "../../render/fixtures/blank";
import {
	addField,
	addRecord,
	deleteField,
	deleteRecord,
	importRecords,
	renameFieldKey,
	setCell,
	setFieldLabel,
} from "./records";

const doc: CutlineDocument = {
	...blankDocument,
	fields: [
		{ key: "name", label: "Имя", sample: "" },
		{ key: "city", label: "Город", sample: "" },
	],
	records: [
		{ name: "Анна", city: "Казань" },
		{ name: "Олег", city: "Томск" },
	],
	elements: [
		{
			id: "t",
			name: "t",
			type: "text",
			x: 0,
			y: 0,
			w: 10,
			h: 5,
			rotation: 0,
			locked: false,
			visible: true,
			content: "{{name}}, {{city}}",
			font: "Inter",
			weight: "regular",
			size: 3,
			minSize: 2,
			lineHeight: 1.2,
			tracking: 0,
			align: "left",
			valign: "top",
			color: "#000",
			fit: "none",
			transform: "none",
		},
	],
};

describe("записи", () => {
	it("новая запись — пустые значения по всем полям", () => {
		expect(addRecord(doc).records.at(-1)).toEqual({ name: "", city: "" });
	});

	it("удаление и правка ячейки по индексу", () => {
		expect(deleteRecord(doc, 0).records).toEqual([
			{ name: "Олег", city: "Томск" },
		]);
		expect(setCell(doc, 1, "city", "Омск").records[1]).toEqual({
			name: "Олег",
			city: "Омск",
		});
	});
});

describe("поля", () => {
	it("новое поле — уникальный латинский ключ, колонка во всех записях", () => {
		const { doc: next, key } = addField(doc);
		expect(key).toBe("field_3");
		expect(next.fields.at(-1)).toEqual({
			key: "field_3",
			label: "Поле 3",
			sample: "",
		});
		expect(next.records.every((r) => r.field_3 === "")).toBe(true);
		expect(addField(next).key).toBe("field_4");
	});

	it("переименование label не трогает ключ", () => {
		expect(setFieldLabel(doc, "name", "ФИО").fields[0]).toEqual({
			key: "name",
			label: "ФИО",
			sample: "",
		});
	});

	it("смена ключа переписывает записи и плейсхолдеры макета", () => {
		const next = renameFieldKey(doc, "name", " {{fio}} ");
		if (typeof next === "string") throw new Error(next);
		expect(next.fields[0]?.key).toBe("fio");
		expect(next.records[0]).toEqual({ fio: "Анна", city: "Казань" });
		const text = next.elements[0];
		expect(text?.type === "text" && text.content).toBe("{{fio}}, {{city}}");
	});

	it("пустой и занятый ключ отклоняются", () => {
		expect(renameFieldKey(doc, "name", " {} ")).toBe("empty");
		expect(renameFieldKey(doc, "name", "city")).toBe("duplicate");
		expect(renameFieldKey(doc, "name", "name")).toBe(doc);
	});

	it("удаление поля убирает колонку из записей, макет не трогает", () => {
		const next = deleteField(doc, "city");
		expect(next.fields.map((f) => f.key)).toEqual(["name"]);
		expect(next.records[0]).toEqual({ name: "Анна" });
		expect(next.elements).toBe(doc.elements);
	});
});

describe("importRecords", () => {
	const table = toTable(
		[
			["ФИО", "Город", "Email", ""],
			["Ира", "Уфа", "i@x.ru", "a"],
			["Лев", "Орёл", "l@x.ru", "b"],
		],
		true,
	);

	it("replace: сопоставленные колонки, новые поля из заголовков, пропуск", () => {
		const next = importRecords(
			doc,
			table,
			["name", "city", NEW_FIELD, NEW_FIELD],
			"replace",
		);
		expect(next.fields.map((f) => [f.key, f.label])).toEqual([
			["name", "Имя"],
			["city", "Город"],
			["Email", "Email"],
			["field_4", "Колонка 4"],
		]);
		expect(next.records).toEqual([
			{ name: "Ира", city: "Уфа", Email: "i@x.ru", field_4: "a" },
			{ name: "Лев", city: "Орёл", Email: "l@x.ru", field_4: "b" },
		]);
	});

	it("append: старые записи остаются и получают новые поля пустыми", () => {
		const next = importRecords(
			doc,
			table,
			["name", SKIP, NEW_FIELD, SKIP],
			"append",
		);
		expect(next.records).toEqual([
			{ name: "Анна", city: "Казань", Email: "" },
			{ name: "Олег", city: "Томск", Email: "" },
			{ name: "Ира", city: "", Email: "i@x.ru" },
			{ name: "Лев", city: "", Email: "l@x.ru" },
		]);
	});

	it("заголовок, совпавший с существующим ключом, не перетирает поле", () => {
		const clash = toTable([["name"], ["Ира"]], true);
		const next = importRecords(doc, clash, [NEW_FIELD], "replace");
		expect(next.fields.at(-1)?.key).toBe("field_3");
		expect(next.records[0]).toEqual({ name: "", city: "", field_3: "Ира" });
	});
});
