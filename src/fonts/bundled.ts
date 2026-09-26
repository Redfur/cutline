// Встроенные шрифты — только с открытой лицензией (OFL, файлы лицензий рядом в files/).
// Только они попадают в PDF: pdf-lib не видит системные шрифты, а текст в PDF идёт
// кривыми из файла шрифта (src/render/outline.ts). Системный шрифт остаётся доступен
// для экрана и SVG, но PDF с ним не соберётся.
//
// Golos Text, Manrope и JetBrains Mono в google/fonts вариативные — opentype.js не
// инстанцирует оси, поэтому в files/ лежат статичные срезы wght=400/700, нарезанные
// fontTools varLib.instancer. PT Serif — статичные Web-версии как есть.
import type { FontWeight } from "../model/document";
import golosBold from "./files/GolosText-Bold.ttf?url";
import golosRegular from "./files/GolosText-Regular.ttf?url";
import jetbrainsBold from "./files/JetBrainsMono-Bold.ttf?url";
import jetbrainsRegular from "./files/JetBrainsMono-Regular.ttf?url";
import manropeBold from "./files/Manrope-Bold.ttf?url";
import manropeRegular from "./files/Manrope-Regular.ttf?url";
import ptSerifBold from "./files/PTSerif-Bold.ttf?url";
import ptSerifRegular from "./files/PTSerif-Regular.ttf?url";

export const BUNDLED_FONTS: Record<string, Record<FontWeight, string>> = {
	"Golos Text": { regular: golosRegular, bold: golosBold },
	Manrope: { regular: manropeRegular, bold: manropeBold },
	"PT Serif": { regular: ptSerifRegular, bold: ptSerifBold },
	"JetBrains Mono": { regular: jetbrainsRegular, bold: jetbrainsBold },
};

export const BUNDLED_FAMILIES = Object.keys(BUNDLED_FONTS);

export function bundledFontUrl(
	family: string,
	weight: FontWeight,
): string | undefined {
	return Object.hasOwn(BUNDLED_FONTS, family)
		? BUNDLED_FONTS[family][weight]
		: undefined;
}

export function isBundledFont(family: string): boolean {
	return Object.hasOwn(BUNDLED_FONTS, family);
}
