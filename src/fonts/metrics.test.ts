import { describe, expect, it } from "vitest";
import { BUNDLED_FONTS } from "./bundled";
import { BUNDLED_METRICS } from "./metrics";
import { loadTestFont } from "./testFonts";

describe("BUNDLED_METRICS", () => {
	it("есть у каждого встроенного семейства", () => {
		expect(Object.keys(BUNDLED_METRICS).sort()).toEqual(
			Object.keys(BUNDLED_FONTS).sort(),
		);
	});

	it("совпадают с hhea каждого файла", () => {
		for (const [family, files] of Object.entries(BUNDLED_FONTS)) {
			for (const url of Object.values(files)) {
				const file = String(url).split("/").pop()?.split("?")[0] ?? "";
				const font = loadTestFont(file);
				const { hhea, head } = font.tables;
				expect(BUNDLED_METRICS[family]).toEqual({
					ascent: hhea.ascender / head.unitsPerEm,
					descent: -hhea.descender / head.unitsPerEm,
				});
			}
		}
	});
});
