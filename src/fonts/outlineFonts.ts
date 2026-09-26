// Встроенные шрифты, разобранные opentype.js для перевода текста в кривые. Отдельно от
// load.ts: opentype.js тяжёлый и нужен только экспорту PDF, который грузится лениво.
import { type Font, parse } from "opentype.js";
import type { CutlineDocument } from "../model/document";
import type { OutlineFonts } from "../render/outline";
import { bundledFontUrl } from "./bundled";
import { textFonts } from "./load";

const parsedFonts = new Map<string, Promise<Font>>();

function parseFont(url: string): Promise<Font> {
	let font = parsedFonts.get(url);
	if (!font) {
		font = fetch(url)
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.arrayBuffer();
			})
			.then((buf) => parse(buf));
		// неудачу не кэшируем — следующий экспорт попробует снова
		font.catch(() => parsedFonts.delete(url));
		parsedFonts.set(url, font);
	}
	return font;
}

// Все встроенные шрифты документа, разобранные для перевода текста в кривые.
// Системные сюда не попадают — их отсекает проверка перед экспортом (pdfPreflight).
export async function loadOutlineFonts(
	doc: CutlineDocument,
): Promise<OutlineFonts> {
	const loaded = new Map<string, Font>();
	await Promise.all(
		textFonts(doc).map(async ({ family, weight }) => {
			const url = bundledFontUrl(family, weight);
			if (!url) return;
			try {
				loaded.set(url, await parseFont(url));
			} catch (err) {
				throw new Error(
					`Не удалось загрузить шрифт ${family} (${weight === "bold" ? "Bold" : "Regular"}): ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		}),
	);
	return (family, weight) => {
		const url = bundledFontUrl(family, weight);
		return url ? loaded.get(url) : undefined;
	};
}
