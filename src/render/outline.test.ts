import { describe, expect, it } from "vitest";
import { loadTestFont as loadFont, TEST_FONT_FILES } from "../fonts/testFonts";
import { outlineWidth, textPathData } from "./outline";

const golos = loadFont("GolosText-Regular.ttf");

describe("встроенные шрифты", () => {
	const files = TEST_FONT_FILES;

	it("все четырнадцать начертаний на месте", () => {
		// три семейства по четыре (400–700) и PT Serif — Regular/Bold
		expect(files).toHaveLength(14);
	});

	it.each(files)("%s разбирается и рисует кириллицу", (file) => {
		const font = loadFont(file);
		// индекс 0 — .notdef, «тофу» вместо буквы
		expect(font.charToGlyphIndex("Ж")).toBeGreaterThan(0);
		expect(font.charToGlyphIndex("ё")).toBeGreaterThan(0);
		expect(textPathData(font, "Жёлудь", 0, 10, 5, 0, "start")).not.toBe("");
	});
});

describe("outlineWidth", () => {
	it("без трекинга — ширина opentype с кернингом", () => {
		expect(outlineWidth(golos, "AVATAR", 10, 0)).toBeCloseTo(
			golos.getAdvanceWidth("AVATAR", 10, { kerning: true }),
			9,
		);
	});

	it("трекинг — только между знаками, как в measureText", () => {
		const base = outlineWidth(golos, "Имя", 10, 0);
		expect(outlineWidth(golos, "Имя", 10, 0.5)).toBeCloseTo(base + 0.5 * 2, 9);
	});

	it("пары с пробелом не кернятся — как у Chromium, который шейпит по словам", () => {
		// у PT Serif пробел кернится с запятой и тире; у браузера — нет
		const serif = loadFont("PTSerif-Regular.ttf");
		const parts = ["Wolf,", " ", "—", " ", "ёЖ"].map((run) =>
			serif.getAdvanceWidth(run, 6, { kerning: true }),
		);
		expect(outlineWidth(serif, "Wolf, — ёЖ", 6, 0)).toBeCloseTo(
			parts.reduce((a, b) => a + b),
			9,
		);
		expect(outlineWidth(serif, "Wolf, — ёЖ", 6, 0)).toBeGreaterThan(
			serif.getAdvanceWidth("Wolf, — ёЖ", 6, { kerning: true }),
		);
	});

	it("пустая строка — ноль", () => {
		expect(outlineWidth(golos, "", 10, 1)).toBe(0);
	});
});

describe("textPathData", () => {
	it("пустая строка — пустой путь", () => {
		expect(textPathData(golos, "", 0, 0, 10, 0, "start")).toBe("");
	});

	it("якорь сдвигает строку на ширину или её половину", () => {
		const w = outlineWidth(golos, "Имя Фамилия", 6, 0.2);
		const fromStart = (x: number) =>
			textPathData(golos, "Имя Фамилия", x, 20, 6, 0.2, "start");
		expect(textPathData(golos, "Имя Фамилия", 50, 20, 6, 0.2, "end")).toBe(
			fromStart(50 - w),
		);
		expect(textPathData(golos, "Имя Фамилия", 50, 20, 6, 0.2, "middle")).toBe(
			fromStart(50 - w / 2),
		);
	});

	it("кегль в мм: высота прописной — доля кегля, базовая линия на месте", () => {
		const path = golos.getPath("H", 0, 20, 10);
		const box = path.getBoundingBox();
		expect(box.y2).toBeCloseTo(20, 1);
		// у прописной высота ~0,7 кегля — не пиксели и не пункты
		expect(box.y2 - box.y1).toBeGreaterThan(6);
		expect(box.y2 - box.y1).toBeLessThan(8);
	});
});
