// Встроенные шрифты на экране: FontFace (canvas measureText и <text> в SVG рисуют тем,
// что есть в document.fonts). Кривые для PDF — из тех же файлов (outlineFonts.ts),
// поэтому экран и PDF меряют один шрифт. opentype.js сюда не импортируется: он нужен
// только при экспорте и грузится вместе с ним.
import type { CutlineDocument, FontWeight } from "../model/document";
import { bundledFontUrl } from "./bundled";

export interface FontUse {
	family: string;
	weight: FontWeight;
}

// Скрытые тексты тоже: их включают обратно, и шрифт уже должен быть на месте
export function textFonts(doc: CutlineDocument): FontUse[] {
	const seen = new Map<string, FontUse>();
	for (const el of doc.elements) {
		if (el.type !== "text") continue;
		seen.set(`${el.font}\u0000${el.weight}`, {
			family: el.font,
			weight: el.weight,
		});
	}
	return [...seen.values()];
}

const registeredFaces = new Set<string>();

// Лениво, только то, чем набран документ: PT Serif весит 700 КБ, а на бейдже его нет.
// Догрузку ловит useFontsVersion по событию loadingdone — отсюда ничего не сообщаем.
export function ensureFontFaces(doc: CutlineDocument): void {
	for (const { family, weight } of textFonts(doc)) {
		const url = bundledFontUrl(family, weight);
		if (!url || registeredFaces.has(url)) continue;
		registeredFaces.add(url);
		const face = new FontFace(family, `url(${url})`, {
			weight: weight === "bold" ? "700" : "400",
		});
		document.fonts.add(face);
		face.load().catch((err: unknown) => {
			// без шрифта текст нарисуется запасным — редактор работает дальше
			registeredFaces.delete(url);
			console.warn(`Не загрузился шрифт ${family}`, err);
		});
	}
}
