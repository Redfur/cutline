// Единый модуль измерения текста — им пользуются и автоподгонка (fit.ts), и render().
// Если превью и экспорт станут мерить текст по-разному, вёрстка разъедется между
// экраном и печатью (см. CLAUDE.md, «Известные подводные камни»).
//
// Кегль в модели документа — миллиметры. Canvas меряет в условных "px", но раз мы
// везде передаём туда те же числа из модели, единицы результата тоже можно читать
// как миллиметры: важно единообразие, а не физический смысл промежуточного "px".

import { bundledMetrics } from "../fonts/metrics";
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

// Родовые ключевые слова CSS нельзя брать в кавычки — в кавычках браузер ищет
// шрифт с таким буквальным именем вместо общего fallback'а, и метрики расходятся
// с тем, что фактически нарисует <text font-family="…"> в render.ts (там имя идёт
// без кавычек). Список — то же самое, что фактически поддерживают браузеры.
const GENERIC_FONT_FAMILIES = new Set([
	"serif",
	"sans-serif",
	"monospace",
	"cursive",
	"fantasy",
	"system-ui",
	"ui-serif",
	"ui-sans-serif",
	"ui-monospace",
	"ui-rounded",
	"math",
	"emoji",
	"fangsong",
]);

function cssFontFamily(family: string): string {
	return GENERIC_FONT_FAMILIES.has(family) ? family : `"${family}"`;
}

export interface TextMetricsMm {
	widthMm: number;
	ascentMm: number;
	descentMm: number;
}

// Chromium отдаёт fontBoundingBoxAscent/Descent целыми px. Кегль тут — мм (3–10 «px»),
// и базовая линия прыгала ступеньками по миллиметру при плавной смене кегля. Системный
// шрифт меряем на опорном кегле и масштабируем — ошибка округления 1/1000 кегля
const METRICS_REFERENCE_PX = 1000;

function verticalMetrics(
	ctx: CanvasRenderingContext2D,
	fontFamily: string,
	weight: FontWeight,
) {
	const bundled = bundledMetrics(fontFamily);
	if (bundled) return bundled;
	ctx.font = `${weight} ${METRICS_REFERENCE_PX}px ${cssFontFamily(fontFamily)}`;
	const m = ctx.measureText("");
	return {
		ascent: m.fontBoundingBoxAscent / METRICS_REFERENCE_PX,
		descent: m.fontBoundingBoxDescent / METRICS_REFERENCE_PX,
	};
}

export function measureText(
	text: string,
	sizeMm: number,
	trackingMm: number,
	fontFamily: string,
	weight: FontWeight,
): TextMetricsMm {
	const ctx = getMeasureContext();
	// встроенные — из таблицы (точно и одинаково везде), системные — canvas
	const { ascent, descent } = verticalMetrics(ctx, fontFamily, weight);
	ctx.font = `${weight} ${sizeMm}px ${cssFontFamily(fontFamily)}`;
	const metrics = ctx.measureText(text);
	const trackingWidth = text.length > 1 ? trackingMm * (text.length - 1) : 0;
	return {
		widthMm: metrics.width + trackingWidth,
		ascentMm: ascent * sizeMm,
		descentMm: descent * sizeMm,
	};
}
