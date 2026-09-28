// Высота рамки текста-строки — одна строка (кегль · межстрочный), как «auto width» в
// Фигме; не ручная. Здесь, в модели, а не в редакторе: ей пользуются и миграции v7→v8 и
// v8→v9, и шаблоны, и редактор (editor/lib/textBox.ts).
import { bundledMetrics, TYPICAL_METRICS } from "../fonts/metrics";
import type { TextElement, TextValign } from "./document";

// до v9 было «по базовой линии» вместо «по низу»
export type LegacyValign = TextValign | "baseline";

// двоичный хвост 7.199999999999999 из size · lineHeight — в инспекторе и в SVG
const round = (v: number) => Math.round(v * 1e6) / 1e6;

export function lineBoxHeight(
	el: Pick<TextElement, "size" | "lineHeight">,
): number {
	return round(el.size * el.lineHeight);
}

// Рамка строки с ручной высотой → авто-высота так, чтобы текст остался на месте. Все
// три выравнивания считаются без метрик шрифта: «по верху» от h не зависит, «по центру»
// держит центр рамки, «по базовой» — нижний край (там базовая линия)
export function lineTextBox(
	el: Pick<TextElement, "y" | "h" | "size" | "lineHeight"> & {
		valign: LegacyValign;
	},
): { y: number; h: number } {
	const h = lineBoxHeight(el);
	switch (el.valign) {
		case "top":
			return { y: el.y, h };
		case "middle":
			return { y: round(el.y + el.h / 2 - h / 2), h };
		case "bottom":
		case "baseline":
			return { y: round(el.y + el.h - h), h };
	}
}

// До v9 базовая линия считалась от метрик шрифта: «по верху» — ascent от верха рамки,
// «по базовой» — базовая последней строки на нижнем крае. С v9 строки — коробки высотой
// в межстрочный с буквами по центру (render/layout.ts). Сдвиг y, при котором первая
// базовая остаётся на месте; «по центру» в обеих моделях совпадает, «по базовой» → «по
// низу» от числа строк не зависит. Метрики — номинального кегля (у «Уменьшать кегль»
// строка чуть уменьшенная — погрешность в доли мм), у системного шрифта — типичные
export function lineBoxesFromLegacy(
	el: Pick<TextElement, "y" | "size" | "lineHeight" | "font"> & {
		valign: LegacyValign;
	},
): { y: number; valign: TextValign } {
	const { ascent, descent } = bundledMetrics(el.font) ?? TYPICAL_METRICS;
	const a = ascent * el.size;
	const d = descent * el.size;
	const line = el.size * el.lineHeight;
	switch (el.valign) {
		case "top":
			return { y: round(el.y - (line - a - d) / 2), valign: "top" };
		case "middle":
			return { y: el.y, valign: "middle" };
		case "bottom":
		case "baseline":
			return { y: round(el.y + (line + d - a) / 2), valign: "bottom" };
	}
}
