// Встроенные шрифты — только с открытой лицензией (OFL, файлы лицензий рядом в files/).
// Только они попадают в PDF: pdf-lib не видит системные шрифты, а текст в PDF идёт
// кривыми из файла шрифта (src/render/outline.ts). Системный шрифт остаётся доступен
// для экрана и SVG, но PDF с ним не соберётся.
//
// Golos Text, Manrope и JetBrains Mono в google/fonts вариативные — opentype.js не
// инстанцирует оси, поэтому в files/ лежат статичные срезы wght=400/500/600/700,
// нарезанные fontTools varLib.instancer --update-name-table (у JetBrains Mono в STAT
// нет значения 600 — имена SemiBold выставлены руками). PT Serif — статичные
// Web-версии как есть, и у него только Regular и Bold.
import type { FontWeight } from "../model/document";
import golosBold from "./files/GolosText-Bold.ttf?url";
import golosMedium from "./files/GolosText-Medium.ttf?url";
import golosRegular from "./files/GolosText-Regular.ttf?url";
import golosSemiBold from "./files/GolosText-SemiBold.ttf?url";
import jetbrainsBold from "./files/JetBrainsMono-Bold.ttf?url";
import jetbrainsMedium from "./files/JetBrainsMono-Medium.ttf?url";
import jetbrainsRegular from "./files/JetBrainsMono-Regular.ttf?url";
import jetbrainsSemiBold from "./files/JetBrainsMono-SemiBold.ttf?url";
import manropeBold from "./files/Manrope-Bold.ttf?url";
import manropeMedium from "./files/Manrope-Medium.ttf?url";
import manropeRegular from "./files/Manrope-Regular.ttf?url";
import manropeSemiBold from "./files/Manrope-SemiBold.ttf?url";
import ptSerifBold from "./files/PTSerif-Bold.ttf?url";
import ptSerifRegular from "./files/PTSerif-Regular.ttf?url";

export const FONT_WEIGHTS: FontWeight[] = [400, 500, 600, 700];

export const WEIGHT_LABELS: Record<FontWeight, string> = {
	400: "Regular",
	500: "Medium",
	600: "SemiBold",
	700: "Bold",
};

export const BUNDLED_FONTS: Record<
	string,
	Partial<Record<FontWeight, string>>
> = {
	"Golos Text": {
		400: golosRegular,
		500: golosMedium,
		600: golosSemiBold,
		700: golosBold,
	},
	Manrope: {
		400: manropeRegular,
		500: manropeMedium,
		600: manropeSemiBold,
		700: manropeBold,
	},
	"PT Serif": { 400: ptSerifRegular, 700: ptSerifBold },
	"JetBrains Mono": {
		400: jetbrainsRegular,
		500: jetbrainsMedium,
		600: jetbrainsSemiBold,
		700: jetbrainsBold,
	},
};

export const BUNDLED_FAMILIES = Object.keys(BUNDLED_FONTS);

export function isBundledFont(family: string): boolean {
	return Object.hasOwn(BUNDLED_FONTS, family);
}

// Начертания семейства: у встроенного — те, что есть файлами, у системного — все
// (что из них есть на машине, решает браузер)
export function familyWeights(family: string): FontWeight[] {
	if (!isBundledFont(family)) return FONT_WEIGHTS;
	return FONT_WEIGHTS.filter((w) => BUNDLED_FONTS[family][w]);
}

// Подбор начертания по правилу CSS Fonts: так браузер выбирает среди FontFace, которые
// мы ему зарегистрировали, — и кривые для PDF берутся из того же файла, что на экране.
// 400–500: сначала тяжелее до 500, потом легче, потом тяжелее 500. Меньше 400 — легче,
// потом тяжелее. Больше 500 — тяжелее, потом легче. PT Serif: 500 → 400, 600 → 700.
export function resolveWeight(
	available: readonly FontWeight[],
	desired: FontWeight,
): FontWeight {
	if (available.includes(desired)) return desired;
	const asc = [...available].sort((a, b) => a - b);
	const lighter = asc.filter((w) => w < desired).reverse();
	const heavier = asc.filter((w) => w > desired);
	const order =
		desired >= 400 && desired <= 500
			? [
					...heavier.filter((w) => w <= 500),
					...lighter,
					...heavier.filter((w) => w > 500),
				]
			: desired < 400
				? [...lighter, ...heavier]
				: [...heavier, ...lighter];
	return order[0] ?? desired;
}

// Файл, которым встроенное семейство набирает этот вес, и его настоящий вес
export function bundledFontFile(
	family: string,
	weight: FontWeight,
): { url: string; weight: FontWeight } | undefined {
	if (!isBundledFont(family)) return undefined;
	const actual = resolveWeight(familyWeights(family), weight);
	const url = BUNDLED_FONTS[family][actual];
	return url ? { url, weight: actual } : undefined;
}

export function bundledFontUrl(
	family: string,
	weight: FontWeight,
): string | undefined {
	return bundledFontFile(family, weight)?.url;
}
