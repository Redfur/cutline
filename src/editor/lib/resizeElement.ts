// Геометрия resize по одному из 8 маркеров — чистая функция, без DOM и без состояния,
// чтобы её можно было применить и во время live-превью драга, и (потом) при snapping.
import type { CutlineElement } from "../../model/document";

export interface HandlePos {
	x: 0 | 0.5 | 1;
	y: 0 | 0.5 | 1;
}

// не даём элементу схлопнуться в отрицательный/нулевой размер при перетаскивании
// маркера через противоположный край — без разворота, просто зажимаем минимумом
const MIN_SIZE_MM = 0.1;

export function resizeElement(
	start: CutlineElement,
	handle: HandlePos,
	dxMm: number,
	dyMm: number,
): CutlineElement {
	let { x, y, w, h } = start;

	if (handle.x === 0) {
		x = start.x + dxMm;
		w = start.w - dxMm;
	} else if (handle.x === 1) {
		w = start.w + dxMm;
	}

	if (handle.y === 0) {
		y = start.y + dyMm;
		h = start.h - dyMm;
	} else if (handle.y === 1) {
		h = start.h + dyMm;
	}

	// зажимаем минимумом так, чтобы неподвижный край (противоположный перетаскиваемому
	// маркеру) остался на месте — иначе элемент дёргался бы в момент упора в минимум
	if (w < MIN_SIZE_MM) {
		w = MIN_SIZE_MM;
		x = handle.x === 0 ? start.x + start.w - MIN_SIZE_MM : start.x;
	}
	if (h < MIN_SIZE_MM) {
		h = MIN_SIZE_MM;
		y = handle.y === 0 ? start.y + start.h - MIN_SIZE_MM : start.y;
	}

	return { ...start, x, y, w, h };
}

export function moveElement(
	start: CutlineElement,
	dxMm: number,
	dyMm: number,
): CutlineElement {
	return { ...start, x: start.x + dxMm, y: start.y + dyMm };
}

export type LineEnd = "start" | "end";

// У линии вместо 8 маркеров два — на концах. Тянется один конец, другой стоит на
// месте; w/h — вектор от начала к концу, поэтому без зажима минимумом: нулевая
// проекция на ось (горизонтальная линия) и смена знака (конец ушёл левее начала) —
// нормальные состояния, а не схлопывание.
export function moveLineEnd<
	T extends Pick<CutlineElement, "x" | "y" | "w" | "h">,
>(start: T, end: LineEnd, dxMm: number, dyMm: number): T {
	if (end === "end") {
		return { ...start, w: start.w + dxMm, h: start.h + dyMm };
	}
	return {
		...start,
		x: start.x + dxMm,
		y: start.y + dyMm,
		w: start.w - dxMm,
		h: start.h - dyMm,
	};
}
