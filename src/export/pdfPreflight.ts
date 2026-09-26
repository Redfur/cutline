// Проверка документа до сборки PDF. Текст в PDF идёт только кривыми встроенного шрифта
// (src/fonts/bundled.ts): системный шрифт pdf-lib не видит, а растрировать текст для
// типографии хуже, чем честно сказать, что поменять.
import { BUNDLED_FAMILIES, isBundledFont } from "../fonts/bundled";
import type { CutlineDocument, TextElement } from "../model/document";

// Скрытые элементы не печатаются — их шрифт не важен
export function pdfFontProblems(doc: CutlineDocument): string[] {
	return doc.elements
		.filter(
			(el): el is TextElement =>
				el.type === "text" && el.visible && !isBundledFont(el.font),
		)
		.map(
			(el) =>
				`«${el.name}» набран шрифтом ${el.font || "без названия"} — он системный и в PDF не попадёт`,
		);
}

export function pdfFontProblemsMessage(problems: string[]): string {
	return [
		"PDF не собран:",
		...problems.map((p) => `— ${p}`),
		"",
		`Выберите встроенный шрифт: ${BUNDLED_FAMILIES.join(", ")}.`,
	].join("\n");
}
