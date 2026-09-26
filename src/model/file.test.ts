import { describe, expect, it } from "vitest";
import { blankDocument } from "../render/fixtures/blank";
import { parseDocument, serializeDocument, validateDocument } from "./file";

describe("validateDocument", () => {
	it("валидный документ проходит как есть", () => {
		expect(validateDocument(blankDocument)).toEqual(blankDocument);
	});

	it("документ до направляющих получает пустой guides", () => {
		const { guides: _guides, ...old } = blankDocument;
		expect(validateDocument(old).guides).toEqual([]);
	});

	it("не трогает входной объект", () => {
		const { guides: _guides, ...old } = blankDocument;
		validateDocument(old);
		expect("guides" in old).toBe(false);
	});

	it("мусор отклоняется понятной ошибкой", () => {
		expect(() => validateDocument(null)).toThrow("не похож на документ");
		expect(() => validateDocument({ version: 1, canvas: {} })).toThrow(
			'нет поля "fonts"',
		);
		expect(() => validateDocument([blankDocument])).toThrow();
	});
});

describe("parseDocument", () => {
	it("круг сериализации", () => {
		expect(parseDocument(serializeDocument(blankDocument))).toEqual(
			blankDocument,
		);
	});

	it("не JSON", () => {
		expect(() => parseDocument("{")).toThrow("это не JSON");
	});
});
