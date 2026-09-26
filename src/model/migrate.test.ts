import { describe, expect, it } from "vitest";
import { blankDocument } from "../render/fixtures/blank";
import type { CutlineDocument, TextElement } from "./document";
import { validateDocument } from "./file";
import { CURRENT_VERSION, migrateDocument } from "./migrate";

function text(valign: TextElement["valign"]): TextElement {
	return {
		id: valign,
		name: valign,
		type: "text",
		x: 0,
		y: 50,
		w: 40,
		h: 5,
		rotation: 0,
		locked: false,
		visible: true,
		content: "A",
		font: "Inter",
		weight: "regular",
		size: 5,
		minSize: 2,
		lineHeight: 1.2,
		tracking: 0,
		align: "left",
		valign,
		color: "#000",
		fit: "none",
		transform: "none",
	};
}

const v1: CutlineDocument = {
	...blankDocument,
	version: 1,
	elements: [text("baseline"), text("top"), text("middle")],
};

describe("migrateDocument", () => {
	it("v1 → v2: у текстов «по базовой» y −= h, остальные не трогаем", () => {
		const v2 = migrateDocument(v1);
		expect(v2.version).toBe(2);
		expect(v2.elements.map((el) => el.y)).toEqual([45, 50, 50]);
	});

	it("текущая версия — без изменений", () => {
		expect(migrateDocument(blankDocument)).toBe(blankDocument);
		expect(blankDocument.version).toBe(CURRENT_VERSION);
	});

	it("документ новее редактора — понятная ошибка", () => {
		expect(() => migrateDocument({ ...blankDocument, version: 99 })).toThrow(
			"более новой версией",
		);
	});

	it("validateDocument мигрирует: и файл, и сессия приходят в текущей схеме", () => {
		expect(validateDocument(v1).version).toBe(CURRENT_VERSION);
	});
});
