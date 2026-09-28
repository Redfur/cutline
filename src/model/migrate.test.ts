import { describe, expect, it } from "vitest";
import { blankDocument } from "../render/fixtures/blank";
import type { CutlineDocument, TextElement } from "./document";
import { validateDocument } from "./file";
import {
	type AnyVersionDocument,
	CURRENT_VERSION,
	migrateDocument,
	UNTITLED,
} from "./migrate";

function text(
	valign: TextElement["valign"],
	weight: "regular" | "bold" = "regular",
	fit: "shrink" | "clip" | "wrap" | "none" = "none",
): AnyVersionDocument["elements"][number] {
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
		weight,
		size: 5,
		minSize: 2,
		lineHeight: 1.2,
		tracking: 0,
		align: "left",
		valign,
		color: "#000",
		fit,
		transform: "none",
	};
}

const v1: AnyVersionDocument = {
	...blankDocument,
	version: 1,
	elements: [text("baseline"), text("top"), text("middle")],
};

describe("migrateDocument", () => {
	it("v1 → v2: у текстов «по базовой» y −= h, остальные не трогаем", () => {
		const migrated = migrateDocument(v1);
		expect(migrated.version).toBe(CURRENT_VERSION);
		expect(migrated.elements.map((el) => el.y)).toEqual([45, 50, 50]);
	});

	it("v2 → v3: появляется имя «Без названия», остальное не трогаем", () => {
		const v2 = {
			...blankDocument,
			version: 2,
			name: undefined,
		} as unknown as CutlineDocument;
		const v3 = migrateDocument(v2);
		expect(v3.version).toBe(CURRENT_VERSION);
		expect(v3.name).toBe(UNTITLED);
		expect(v3.elements).toEqual(v2.elements);
	});

	it("v3 → v4: вес regular/bold становится 400/700 у текстов и в fonts", () => {
		const v3: AnyVersionDocument = {
			...blankDocument,
			version: 3,
			fonts: [
				{ family: "Manrope", weight: "regular", source: "bundled" },
				{ family: "Manrope", weight: "bold", source: "bundled" },
			],
			elements: [text("top", "regular"), text("top", "bold")],
		};
		const v4 = migrateDocument(v3);
		expect(v4.version).toBe(CURRENT_VERSION);
		expect(v4.fonts.map((f) => f.weight)).toEqual([400, 700]);
		expect(
			v4.elements.map((el) => (el.type === "text" ? el.weight : null)),
		).toEqual([400, 700]);
	});

	it("v4 → v5: у картинок появляется прозрачный фон", () => {
		const v4: AnyVersionDocument = {
			...blankDocument,
			version: 4,
			elements: [
				{
					id: "img",
					name: "Фото",
					type: "image",
					x: 0,
					y: 0,
					w: 10,
					h: 10,
					rotation: 0,
					locked: false,
					visible: true,
					src: "{{photo}}",
					fit: "cover",
				},
			],
		};
		const v5 = migrateDocument(v4);
		expect(v5.version).toBe(CURRENT_VERSION);
		expect(v5.elements[0]).toMatchObject({ type: "image", background: null });
	});

	it("v5 → v6: у картинок оформление QR — чёрные квадраты, как рисовалось раньше", () => {
		const v5: AnyVersionDocument = {
			...blankDocument,
			version: 5,
			elements: [
				{
					id: "qr",
					name: "QR",
					type: "image",
					x: 0,
					y: 0,
					w: 10,
					h: 10,
					rotation: 0,
					locked: false,
					visible: true,
					src: "{{ qr(link) }}",
					fit: "contain",
					background: "#FFFFFF",
				},
			],
		};
		const v6 = migrateDocument(v5);
		expect(v6.version).toBe(CURRENT_VERSION);
		expect(v6.elements[0]).toMatchObject({
			background: "#FFFFFF",
			qr: { color: "#000000", modules: "square", eyes: "square" },
		});
	});

	it("v6 → v7: fit текста — вид и правила, вид карточки тот же", () => {
		const v6: AnyVersionDocument = {
			...blankDocument,
			version: 6,
			elements: [
				{ ...text("top", "regular", "shrink"), id: "shrink" },
				{ ...text("top", "regular", "clip"), id: "clip" },
				{ ...text("top", "regular", "none"), id: "none" },
				{ ...text("top", "regular", "wrap"), id: "wrap" },
			],
		};
		const v7 = migrateDocument(v6);
		const rules = v7.elements.map((el) =>
			el.type === "text"
				? [el.id, el.mode, el.shrink, el.ellipsis, el.maxLines]
				: null,
		);
		expect(rules).toEqual([
			["shrink", "line", true, true, null],
			["clip", "line", false, true, null],
			["none", "line", false, false, null],
			["wrap", "block", false, false, null],
		]);
		expect(v7.elements[0]).not.toHaveProperty("fit");
		expect(v7.elements[3]).toMatchObject({ x: 0, y: 50, w: 40, h: 5 });
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
