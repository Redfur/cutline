import { describe, expect, it } from "vitest";
import type { CutlineElement } from "../../model/document";
import { createLine, createRect, createText } from "./createElement";
import { documentColors } from "./documentColors";

const canvas = { w: 105, h: 148, bleed: 3, safe: 4, background: "#ffffff" };

function rect(fill: string | null, stroke: string | null): CutlineElement {
	return { ...createRect({ x: 0, y: 0 }), fill, stroke };
}

describe("documentColors", () => {
	it("собирает фон, заливки, обводки и цвет текста без повторов, частые первыми", () => {
		const elements: CutlineElement[] = [
			rect("#1d3b34", null),
			rect("#1D3B34", "#e8b04a"),
			{ ...createText({ x: 0, y: 0 }), color: "#1d3b34" },
			{ ...createLine({ x: 0, y: 0 }), stroke: "#E8B04A" },
		];
		expect(documentColors({ canvas, elements })).toEqual([
			"#1D3B34",
			"#E8B04A",
			"#FFFFFF",
		]);
	});

	it("пропускает transparent и пустые заливки", () => {
		expect(
			documentColors({
				canvas: { ...canvas, background: "transparent" },
				elements: [rect(null, null)],
			}),
		).toEqual([]);
	});

	it("не больше limit", () => {
		const elements = ["#000001", "#000002", "#000003"].map((c) =>
			rect(c, null),
		);
		expect(documentColors({ canvas, elements }, 2)).toHaveLength(2);
	});
});
