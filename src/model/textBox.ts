// Высота рамки текста-строки — одна строка (кегль · межстрочный), как «auto width» в
// Фигме; не ручная. Здесь, в модели, а не в редакторе: ей пользуются и миграция v7→v8,
// и шаблоны, и редактор (editor/lib/textBox.ts).
import type { TextElement } from "./document";

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
	el: Pick<TextElement, "y" | "h" | "size" | "lineHeight" | "valign">,
): { y: number; h: number } {
	const h = lineBoxHeight(el);
	switch (el.valign) {
		case "top":
			return { y: el.y, h };
		case "middle":
			return { y: round(el.y + el.h / 2 - h / 2), h };
		case "baseline":
			return { y: round(el.y + el.h - h), h };
	}
}
