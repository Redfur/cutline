import { describe, expect, it } from "vitest";
import { blankDocument } from "../render/fixtures/blank";
import { firstBaselineY } from "../render/layout";
import type { CutlineDocument } from "./document";
import { validateDocument } from "./file";
import {
	type AnyVersionDocument,
	CURRENT_VERSION,
	migrateDocument,
	UNTITLED,
} from "./migrate";
import { type LegacyValign, lineBoxesFromLegacy } from "./textBox";

// правила текста v7 — у документов этой версии они уже есть, fit нет
function text(
	valign: LegacyValign,
	weight: "regular" | "bold" = "regular",
	fit: "shrink" | "clip" | "wrap" | "none" = "none",
): Extract<AnyVersionDocument["elements"][number], { type: "text" }> {
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
		// дальше v8 ставит строкам высоту в одну строку (6 мм), сохраняя положение текста:
		// по базовой — нижний край 50, по центру — центр 52.5
		// v9 — строки-коробки: «по базовой» (Inter — типичные метрики 0.95/0.25) ниже на 1.25
		expect(migrated.elements.map((el) => el.y)).toEqual([45.25, 50, 49.5]);
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

	it("v7 → v8: строка — высота в одну строку, текст на месте; блок не трогаем", () => {
		const v7: AnyVersionDocument = {
			...blankDocument,
			version: 7,
			// строка 5 · 1.2 = 6 мм в рамке 5..55 высотой 50; у v7 правила вместо fit
			elements: (["top", "middle", "baseline", "block"] as const).map((id) => ({
				...text(id === "block" ? "top" : id),
				id,
				y: 5,
				h: 50,
				fit: undefined,
				mode: id === "block" ? ("block" as const) : ("line" as const),
				shrink: false,
				ellipsis: false,
				maxLines: null,
			})),
		};
		const boxes = migrateDocument(v7).elements.map((el) => [el.id, el.y, el.h]);
		expect(boxes).toEqual([
			["top", 5, 6],
			// центр рамки на 30
			["middle", 27, 6],
			// нижний край на 55
			// и v9: «по базовой» → «по низу», типичные метрики — ниже на 1.25
			["baseline", 50.25, 6],
			["block", 5, 50],
		]);
	});

	it("v8 → v9: строки-коробки — первая базовая линия на месте", () => {
		// Golos Text: ascent 0.98, descent 0.22; кегль 10, межстрочный 15
		const a = 9.8;
		const d = 2.2;
		const L = 15;
		// старая модель: по верху — ascent от верха, по центру — буквы по центру рамки,
		// по базовой — базовая последней строки на нижнем крае
		const legacyBaseline = (
			valign: LegacyValign,
			y: number,
			h: number,
			n: number,
		) =>
			valign === "top"
				? y + a
				: valign === "middle"
					? y + h / 2 - (a + d + L * (n - 1)) / 2 + a
					: y + h - L * (n - 1);
		for (const valign of ["top", "middle", "baseline"] as const) {
			for (const n of [1, 3]) {
				const el = {
					y: 20,
					size: 10,
					lineHeight: 1.5,
					font: "Golos Text",
					valign,
				};
				const h = 50;
				const next = lineBoxesFromLegacy(el);
				const lines = Array.from({ length: n }, () => "a");
				expect(
					firstBaselineY(next.valign, next.y, h, {
						lines,
						lineHeightMm: L,
						ascentMm: a,
						descentMm: d,
					}),
				).toBeCloseTo(legacyBaseline(valign, 20, h, n), 6);
			}
		}
		expect(
			lineBoxesFromLegacy({
				y: 20,
				size: 10,
				lineHeight: 1.5,
				font: "Golos Text",
				valign: "baseline",
			}).valign,
		).toBe("bottom");
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
