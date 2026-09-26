// Прямоугольник, который занимает элемент на холсте. У всех типов, кроме линии, это
// просто x/y/w/h. У линии w/h — вектор от начала к концу и может быть отрицательным
// (линия «вверх-вправо»), а хитбокс, подсветка на линейках и подпись размера ждут
// коробку с неотрицательной шириной — нормализуем здесь, в одном месте.
import type { CutlineElement } from "../../model/document";

export interface Bounds {
	x: number;
	y: number;
	w: number;
	h: number;
}

export function boundsOf(
	el: Pick<CutlineElement, "x" | "y" | "w" | "h">,
): Bounds {
	return {
		x: Math.min(el.x, el.x + el.w),
		y: Math.min(el.y, el.y + el.h),
		w: Math.abs(el.w),
		h: Math.abs(el.h),
	};
}

export function lineLength(el: Pick<CutlineElement, "w" | "h">): number {
	return Math.hypot(el.w, el.h);
}
