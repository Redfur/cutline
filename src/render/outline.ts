// Текст в кривые: строка → SVG path по глифам шрифта. Нужен PDF (pdf-lib не рисует
// шрифты, которых у него нет в файле) и SVG, который не зависит от шрифтов на чужой
// машине. Раскладку строк (перенос, подгонка кегля) по-прежнему делает layoutText —
// здесь только отрисовка уже готовой строки.
import type { Font, RenderOptions as GlyphOptions } from "opentype.js";
import type { FontWeight } from "../model/document";

// Разобранные шрифты приходят в render() аргументом: рендерер не грузит файлы сам
export type OutlineFonts = (
	family: string,
	weight: FontWeight,
) => Font | undefined;

export type TextAnchor = "start" | "middle" | "end";

// 0,001 мм — меньше любого растра печати, а строка пути у длинного текста короче вдвое
const PATH_DECIMALS = 3;

function glyphOptions(sizeMm: number, trackingMm: number): GlyphOptions {
	// letterSpacing у opentype.js — в долях кегля
	return { kerning: true, letterSpacing: sizeMm ? trackingMm / sizeMm : 0 };
}

// Слова и пробелы по отдельности: Chromium шейпит текст по словам и пары с пробелом
// не кернит, а opentype.js кернит всю строку. У PT Serif такие пары есть (−0,04 кегля),
// и без разбиения кривые выходили уже, чем строку померил canvas для раскладки, —
// до 0,7 мм на строке 6 мм. Внутри слова кернинг opentype.js и браузера совпадает.
function runs(text: string): string[] {
	return text.split(/( )/).filter(Boolean);
}

// Ширина прогона вместе с трекингом после каждого знака, включая последний
function runAdvance(
	font: Font,
	run: string,
	sizeMm: number,
	trackingMm: number,
): number {
	return font.getAdvanceWidth(run, sizeMm, glyphOptions(sizeMm, trackingMm));
}

// Ширина строки с кернингом и трекингом между знаками — как measureText в measure.ts:
// трекинг после последнего знака не считается, иначе якорь «справа» уезжал бы влево
export function outlineWidth(
	font: Font,
	text: string,
	sizeMm: number,
	trackingMm: number,
): number {
	if (!text) return 0;
	const advance = runs(text).reduce(
		(sum, run) => sum + runAdvance(font, run, sizeMm, trackingMm),
		0,
	);
	return advance - trackingMm;
}

// x — точка якоря, как у <text text-anchor>; baselineY — базовая линия
export function textPathData(
	font: Font,
	text: string,
	x: number,
	baselineY: number,
	sizeMm: number,
	trackingMm: number,
	anchor: TextAnchor,
): string {
	if (!text) return "";
	const width = outlineWidth(font, text, sizeMm, trackingMm);
	let cursor =
		anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
	let d = "";
	for (const run of runs(text)) {
		if (run !== " ") {
			d += font
				.getPath(
					run,
					cursor,
					baselineY,
					sizeMm,
					glyphOptions(sizeMm, trackingMm),
				)
				.toPathData(PATH_DECIMALS);
		}
		cursor += runAdvance(font, run, sizeMm, trackingMm);
	}
	return d;
}
