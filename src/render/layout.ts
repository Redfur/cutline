// Раскладка текстового элемента для конкретной записи: подстановка, регистр,
// автоподгонка и признак переполнения. Одна функция и для render(), и для подсветки
// проблем в данных — иначе «не влезло» на экране и в сетке миниатюр считалось бы
// не тем же измерением, что попадает в SVG (CLAUDE.md, «Измерение текста»).
import { type Scope, substitute } from "../data/placeholders";
import type { TextElement, TextValign } from "../model/document";
import { fitBlock, fitLine } from "./fit";
import { measureText } from "./measure";

export interface TextLayout {
	sizeMm: number;
	lines: string[];
	lineHeightMm: number;
	ascentMm: number;
	descentMm: number;
	// true — текст не поместился в рамку так, как задумано: обрезан многоточием,
	// вылез за ширину или строк больше, чем разрешено (fit.ts)
	overflow: boolean;
}

function applyTextTransform(
	text: string,
	transform: TextElement["transform"],
): string {
	if (transform === "upper") return text.toUpperCase();
	if (transform === "lower") return text.toLowerCase();
	return text;
}

// null — после подстановки текста нет (пустое поле), рисовать нечего.
export function layoutText(el: TextElement, scope: Scope): TextLayout | null {
	const substituted = substitute(el.content, scope);
	if (!substituted) {
		return null;
	}
	// CSV и буфер обмена из Windows приносят \r\n, старые Mac — \r
	const normalized = substituted.replace(/\r\n?/g, "\n");
	// transform — до подгонки, не после: прописные буквы шире строчных,
	// подгонка по ширине строчного текста могла бы дать переполнение после регистра.
	const transformed = applyTextTransform(normalized, el.transform);
	const ctx = {
		fontFamily: el.font,
		weight: el.weight,
		trackingMm: el.tracking,
		maxWidthMm: el.w,
	};
	const rules = {
		shrink: el.shrink,
		ellipsis: el.ellipsis,
		minSizeMm: el.minSize,
	};
	const { sizeMm, lines, overflow } =
		el.mode === "block"
			? fitBlock(
					transformed,
					el.size,
					{
						...rules,
						maxLines: el.maxLines,
						heightMm: el.h,
						lineHeight: el.lineHeight,
					},
					ctx,
				)
			: // однострочный: перенос в данных (многострочная ячейка) — просто пробел,
				// иначе имя с \n разломало бы бейдж
				fitLine(transformed.replace(/\n/g, " "), el.size, rules, ctx);
	const { ascentMm, descentMm } = measureText(
		lines[0] ?? "",
		sizeMm,
		el.tracking,
		el.font,
		el.weight,
	);

	return {
		sizeMm,
		lines,
		lineHeightMm: sizeMm * el.lineHeight,
		ascentMm,
		descentMm,
		overflow,
	};
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
		// базовая линия последней строки — на нижнем крае рамки: рамка охватывает текст,
		// а тексты разных кеглей с одним y + h стоят на одной базовой
		case "baseline":
			return y + h - lineHeightMm * (lines.length - 1);
	}
}
