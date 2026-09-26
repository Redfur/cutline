import { describe, expect, it } from "vitest";
import { createText } from "../editor/lib/createElement";
import type { CutlineDocument } from "../model/document";
import { blankDocument } from "../render/fixtures/blank";
import { pdfFontProblems, pdfFontProblemsMessage } from "./pdfPreflight";

const withTexts = (
	...texts: Array<{ name: string; font: string; visible?: boolean }>
): CutlineDocument => ({
	...blankDocument,
	elements: texts.map((t, i) => ({
		...createText({ x: 0, y: 0 }),
		id: `t${i}`,
		name: t.name,
		font: t.font,
		visible: t.visible ?? true,
	})),
});

describe("pdfFontProblems", () => {
	it("встроенные шрифты — без проблем", () => {
		expect(
			pdfFontProblems(
				withTexts(
					{ name: "Имя", font: "Golos Text" },
					{ name: "ID", font: "JetBrains Mono" },
				),
			),
		).toEqual([]);
	});

	it("системный шрифт видимого текста — проблема с именем слоя", () => {
		const problems = pdfFontProblems(
			withTexts(
				{ name: "Имя", font: "Arial" },
				{ name: "Скрытый", font: "Georgia", visible: false },
			),
		);
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain("«Имя»");
		expect(problems[0]).toContain("Arial");
	});

	it("сообщение подсказывает встроенные шрифты", () => {
		expect(pdfFontProblemsMessage(["x"])).toContain("Golos Text");
	});
});
