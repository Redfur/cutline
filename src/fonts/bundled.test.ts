import { describe, expect, it } from "vitest";
import type { FontWeight } from "../model/document";
import {
	BUNDLED_FONTS,
	bundledFontFile,
	FONT_WEIGHTS,
	familyWeights,
	resolveWeight,
} from "./bundled";
import { loadTestFont } from "./testFonts";

describe("resolveWeight — правило подбора CSS", () => {
	const regularBold: FontWeight[] = [400, 700];

	it("есть нужный — он и берётся", () => {
		expect(resolveWeight(FONT_WEIGHTS, 500)).toBe(500);
		expect(resolveWeight(regularBold, 700)).toBe(700);
	});

	it("500 без Medium — легче, 600 без SemiBold — тяжелее", () => {
		expect(resolveWeight(regularBold, 500)).toBe(400);
		expect(resolveWeight(regularBold, 600)).toBe(700);
	});

	it("400 без Regular — сначала Medium, потом легче, потом тяжелее", () => {
		expect(resolveWeight([500, 700], 400)).toBe(500);
		expect(resolveWeight([600, 700], 400)).toBe(600);
	});

	it("700 без Bold — самый тяжёлый из лёгких", () => {
		expect(resolveWeight([400, 500], 700)).toBe(500);
	});
});

describe("каталог встроенных шрифтов", () => {
	it("у PT Serif только Regular и Bold, у остальных — все четыре", () => {
		expect(familyWeights("PT Serif")).toEqual([400, 700]);
		expect(familyWeights("Manrope")).toEqual(FONT_WEIGHTS);
		expect(familyWeights("Arial")).toEqual(FONT_WEIGHTS);
	});

	it("PT Serif SemiBold набирается файлом Bold", () => {
		expect(bundledFontFile("PT Serif", 600)).toEqual({
			url: BUNDLED_FONTS["PT Serif"][700],
			weight: 700,
		});
		expect(bundledFontFile("Arial", 400)).toBeUndefined();
	});

	// файл под весом 500 и правда Medium: перепутанный срез незаметен на глаз в коде
	it.each(
		Object.entries(BUNDLED_FONTS).flatMap(([family, files]) =>
			Object.entries(files).map(([weight, url]) => ({
				family,
				weight: Number(weight),
				file: String(url).split("/").pop() ?? "",
			})),
		),
	)("$family $weight — $file", ({ weight, file }) => {
		expect(loadTestFont(file).tables.os2.usWeightClass).toBe(weight);
	});
});
