// Раскладка текстового элемента для конкретной записи: подстановка, регистр,
// автоподгонка и признак переполнения. Одна функция и для render(), и для подсветки
// проблем в данных — иначе «не влезло» на экране и в сетке миниатюр считалось бы
// не тем же измерением, что попадает в SVG (CLAUDE.md, «Измерение текста»).
import { substitute } from "../data/placeholders";
import type { DataRecord, TextElement, TextValign } from "../model/document";
import { applyFit } from "./fit";
import { measureText } from "./measure";

export interface TextLayout {
	sizeMm: number;
	lines: string[];
	lineHeightMm: number;
	ascentMm: number;
	descentMm: number;
	// true — текст не поместился в рамку так, как задумано: обрезан многоточием,
	// вылез за ширину или перенос дал больше строк, чем вмещает высота
	overflow: boolean;
}

// Допуск на сравнение мм: ширины приходят из canvas во float, а на печати
// сотая миллиметра не видна — ложная тревога от 1e-12 хуже.
const EPS_MM = 0.01;

function applyTextTransform(
	text: string,
	transform: TextElement["transform"],
): string {
	if (transform === "upper") return text.toUpperCase();
	if (transform === "lower") return text.toLowerCase();
	return text;
}

// null — после подстановки текста нет (пустое поле), рисовать нечего.
export function layoutText(
	el: TextElement,
	record: DataRecord,
): TextLayout | null {
	const substituted = substitute(el.content, record);
	if (!substituted) {
		return null;
	}
	// transform — до подгонки, не после: прописные буквы шире строчных,
	// подгонка по ширине строчного текста могла бы дать переполнение после регистра.
	const content = applyTextTransform(substituted, el.transform);
	const ctx = {
		fontFamily: el.font,
		weight: el.weight,
		trackingMm: el.tracking,
		maxWidthMm: el.w,
	};
	const { sizeMm, lines } = applyFit(content, el.fit, el.size, el.minSize, ctx);
	const lineHeightMm = sizeMm * el.lineHeight;
	const widthOf = (line: string) =>
		measureText(line, sizeMm, el.tracking, el.font, el.weight).widthMm;
	const { ascentMm, descentMm } = measureText(
		lines[0] ?? "",
		sizeMm,
		el.tracking,
		el.font,
		el.weight,
	);

	let overflow: boolean;
	switch (el.fit) {
		case "shrink":
		case "clip":
			// clipToFit возвращает исходную строку, только если она влезла целиком
			overflow = lines[0] !== content;
			break;
		case "wrap":
			// одна строка по высоте не проверяется: у baseline-выравнивания y — это
			// базовая линия, и h там не описывает высоту текста
			overflow =
				lines.some((line) => widthOf(line) > el.w + EPS_MM) ||
				(lines.length > 1 && lines.length * lineHeightMm > el.h + EPS_MM);
			break;
		case "none":
			overflow = lines.some((line) => widthOf(line) > el.w + EPS_MM);
			break;
	}

	return { sizeMm, lines, lineHeightMm, ascentMm, descentMm, overflow };
}

// Базовая линия первой строки. Высота блока — от верха первой строки (ascent) до низа
// последней (descent), а не lineHeight·(n−1): с последним у однострочного текста блок
// выходил нулевым, и «по центру» ставило верх текста на середину рамки — текст сидел в
// нижней половине. Ascent/descent — метрики шрифта (fontBoundingBox), а не конкретных
// букв, поэтому строка «ааа» и «ЁЙ» при одном кегле встают одинаково.
export function firstBaselineY(
	valign: TextValign,
	y: number,
	h: number,
	layout: Pick<TextLayout, "lines" | "lineHeightMm" | "ascentMm" | "descentMm">,
): number {
	const { lines, lineHeightMm, ascentMm, descentMm } = layout;
	const blockHeightMm =
		ascentMm + descentMm + lineHeightMm * (lines.length - 1);
	switch (valign) {
		case "top":
			return y + ascentMm;
		case "middle":
			return y + h / 2 - blockHeightMm / 2 + ascentMm;
		case "baseline":
			return y;
	}
}
