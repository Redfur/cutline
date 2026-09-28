// Высота блочного текста с лимитом строк — не ручная: рамка ровно на maxLines строк
// (maxLines · кегль · межстрочный), как «авто-высота» в Фигме. Одна функция на все пути
// правки: поле инспектора, маркер резайза (и его живое превью), H в «Положении».
// Потянули высоту сами — меняется число строк, а рамка встаёт ровно на строки.
import type { CutlineElement, TextElement } from "../../model/document";
import { cleanMm } from "./geometry";

export function lineMm(el: Pick<TextElement, "size" | "lineHeight">): number {
	return el.size * el.lineHeight;
}

export function normalizeText(
	prev: TextElement | null,
	next: TextElement,
): TextElement {
	if (next.mode !== "block" || next.maxLines === null) return next;
	const line = lineMm(next);
	// высоту меняли руками, а не лимит и не кегль — лимит следует за высотой
	const heightDragged =
		prev !== null &&
		prev.mode === "block" &&
		prev.maxLines !== null &&
		next.h !== prev.h &&
		next.maxLines === prev.maxLines &&
		next.size === prev.size &&
		next.lineHeight === prev.lineHeight;
	const maxLines = heightDragged
		? Math.max(1, Math.round(next.h / line))
		: Math.max(1, next.maxLines);
	const h = cleanMm(maxLines * line);
	// тянули верхний край — на месте остаётся нижний
	const y =
		prev !== null && next.y !== prev.y ? cleanMm(next.y + next.h - h) : next.y;
	return { ...next, maxLines, h, y };
}

export function normalizeElement(
	prev: CutlineElement | null,
	next: CutlineElement,
): CutlineElement {
	if (next.type !== "text") return next;
	return normalizeText(prev?.type === "text" ? prev : null, next);
}
