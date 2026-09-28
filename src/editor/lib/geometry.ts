// Прямоугольник, который занимает элемент на холсте. У всех типов, кроме линии, это
// просто x/y/w/h. У линии w/h — вектор от начала к концу и может быть отрицательным
// (линия «вверх-вправо»), а хитбокс, подсветка на линейках и подпись размера ждут
// коробку с неотрицательной шириной — нормализуем здесь, в одном месте.
import type { Canvas, CutlineElement } from "../../model/document";

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

// Элемент целиком за обрезом: на холсте от него остаётся только полупрозрачный
// «призрак», и его легко потерять — оверлей обводит такой пунктиром. Касание края
// тоже считаем «за»: от элемента на карточке не остаётся ни миллиметра.
export function isOffCard(
	el: Pick<CutlineElement, "x" | "y" | "w" | "h">,
	canvas: Pick<Canvas, "w" | "h">,
): boolean {
	const b = boundsOf(el);
	return b.x + b.w <= 0 || b.y + b.h <= 0 || b.x >= canvas.w || b.y >= canvas.h;
}

export function lineLength(el: Pick<CutlineElement, "w" | "h">): number {
	return Math.hypot(el.w, el.h);
}

// Координаты после драга и привязки несут двоичный float-шум («47.37500000000001» в
// инспекторе). Округляем до 1e-6 мм — хвост уходит, а совпадение с краем соседа после
// привязки остаётся точным (до 0.1 мм не округляем: это сломало бы точность драга)
export function cleanMm(v: number): number {
	return Math.round(v * 1e6) / 1e6;
}

export function cleanGeometry<T extends Bounds>(el: T): T {
	return {
		...el,
		x: cleanMm(el.x),
		y: cleanMm(el.y),
		w: cleanMm(el.w),
		h: cleanMm(el.h),
	};
}

// Шаг, до которого округляем то, что пришло от мыши (точка нажатия, дельта драга).
// Пиксель на 100% — 0.26 мм, точнее мышью не попасть, а в инспекторе вместо
// «47.254167» — «47.3». Привязка потом ставит край ровно на цель — её точность
// округление не трогает.
const MOUSE_STEP_MM = 0.1;

export function roundMouseMm(v: number): number {
	return cleanMm(Math.round(v / MOUSE_STEP_MM) * MOUSE_STEP_MM);
}
