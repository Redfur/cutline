import { describe, expect, it } from "vitest";
import { contrastRatio, qrContrastWarning } from "./contrast";

describe("contrastRatio", () => {
	it("чёрный на белом — 21, одинаковые — 1, прозрачный — как белый", () => {
		expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
		expect(contrastRatio("#1D3B34", "#1D3B34")).toBeCloseTo(1, 5);
		expect(contrastRatio("#000", "transparent")).toBeCloseTo(21, 5);
	});
});

describe("qrContrastWarning", () => {
	it("тёмный на светлом — без предупреждения", () => {
		expect(qrContrastWarning("#000000", "#FFFFFF")).toBeNull();
		expect(qrContrastWarning("#1D3B34", "transparent")).toBeNull();
	});

	it("бледный код — слабый контраст", () => {
		expect(qrContrastWarning("#E0E0E0", "#FFFFFF")).toMatch("Слабый контраст");
		expect(qrContrastWarning("#E8A33D", "#FFFFFF")).toMatch("Слабый контраст");
	});

	it("светлый на тёмном — «негатив»", () => {
		expect(qrContrastWarning("#FFFFFF", "#1D3B34")).toMatch("Светлый код");
	});
});
