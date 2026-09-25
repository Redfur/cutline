// Единый модуль измерения текста — им пользуются и автоподгонка (fit.ts), и render().
// Если превью и экспорт станут мерить текст по-разному, вёрстка разъедется между
// экраном и печатью (см. CLAUDE.md, «Известные подводные камни»).
//
// Кегль в модели документа — миллиметры. Canvas меряет в условных "px", но раз мы
// везде передаём туда те же числа из модели, единицы результата тоже можно читать
// как миллиметры: важно единообразие, а не физический смысл промежуточного "px".

import type { FontWeight } from "../model/document";

let measureContext: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D {
	if (!measureContext) {
		const ctx = document.createElement("canvas").getContext("2d");
		if (!ctx) {
			throw new Error("2D canvas недоступен — измерение текста невозможно");
		}
		measureContext = ctx;
	}
	return measureContext;
}

function cssWeight(weight: FontWeight): number {
	return weight === "bold" ? 700 : 400;
}

// Единое место, где имя семейства превращается в CSS font-family — и для измерения,
// и для отрисовки в render(), иначе они могут разойтись в трактовке одного и того же имени.
export function cssFontFamily(family: string): string {
	return `"${family}"`;
}

export interface TextMetricsMm {
	widthMm: number;
	ascentMm: number;
	descentMm: number;
}

export function measureText(
	text: string,
	sizeMm: number,
	trackingMm: number,
	fontFamily: string,
	weight: FontWeight,
): TextMetricsMm {
	const ctx = getMeasureContext();
	ctx.font = `${cssWeight(weight)} ${sizeMm}px ${cssFontFamily(fontFamily)}`;
	const metrics = ctx.measureText(text);
	const trackingWidth = text.length > 1 ? trackingMm * (text.length - 1) : 0;
	return {
		widthMm: metrics.width + trackingWidth,
		ascentMm: metrics.fontBoundingBoxAscent,
		descentMm: metrics.fontBoundingBoxDescent,
	};
}
