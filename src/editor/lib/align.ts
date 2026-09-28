// Групповые правки положения: сдвиг, выравнивание, распределение. Чистые функции
// «элементы документа → элементы», оболочка только оборачивает их в history.set —
// так любое групповое действие ложится в историю одним шагом. Заблокированные
// элементы не двигаются никогда; у линии положение считается по коробке (boundsOf).
import type { CutlineElement } from "../../model/document";
import { type Bounds, boundsOf, cleanMm } from "./geometry";
import { selectionBounds } from "./selection";

export type AlignEdge =
	| "left"
	| "centerX"
	| "right"
	| "top"
	| "centerY"
	| "bottom";

export type Axis = "x" | "y";

function movable(elements: CutlineElement[], ids: string[]): CutlineElement[] {
	return elements.filter((el) => ids.includes(el.id) && !el.locked);
}

// сдвиг по id; у линии x/y — начало, конец едет вместе с ним (w/h — вектор)
function shiftEach(
	elements: CutlineElement[],
	shifts: Map<string, { dx: number; dy: number }>,
): CutlineElement[] {
	return elements.map((el) => {
		const s = shifts.get(el.id);
		if (!s || (s.dx === 0 && s.dy === 0)) return el;
		return { ...el, x: cleanMm(el.x + s.dx), y: cleanMm(el.y + s.dy) };
	});
}

export function offsetElements(
	elements: CutlineElement[],
	ids: string[],
	dx: number,
	dy: number,
): CutlineElement[] {
	return shiftEach(
		elements,
		new Map(movable(elements, ids).map((el) => [el.id, { dx, dy }])),
	);
}

// Цель выравнивания: у группы — её общая рамка (заблокированные в ней тоже, они и
// служат опорой), у одного элемента — сама карточка
export function alignTarget(
	elements: CutlineElement[],
	ids: string[],
	card: Bounds,
): Bounds | null {
	const selected = elements.filter((el) => ids.includes(el.id));
	return selected.length === 1 ? card : selectionBounds(selected);
}

export function alignElements(
	elements: CutlineElement[],
	ids: string[],
	edge: AlignEdge,
	target: Bounds,
): CutlineElement[] {
	const shifts = new Map<string, { dx: number; dy: number }>();
	for (const el of movable(elements, ids)) {
		const b = boundsOf(el);
		let dx = 0;
		let dy = 0;
		if (edge === "left") dx = target.x - b.x;
		if (edge === "centerX") dx = target.x + target.w / 2 - (b.x + b.w / 2);
		if (edge === "right") dx = target.x + target.w - (b.x + b.w);
		if (edge === "top") dy = target.y - b.y;
		if (edge === "centerY") dy = target.y + target.h / 2 - (b.y + b.h / 2);
		if (edge === "bottom") dy = target.y + target.h - (b.y + b.h);
		shifts.set(el.id, { dx, dy });
	}
	return shiftEach(elements, shifts);
}

// Равные промежутки между соседями: крайние стоят на месте, остальные расставляются
// между ними в порядке положения на оси. Меньше трёх — распределять нечего
export function distributeElements(
	elements: CutlineElement[],
	ids: string[],
	axis: Axis,
): CutlineElement[] {
	const items = movable(elements, ids)
		.map((el) => {
			const b = boundsOf(el);
			return axis === "x"
				? { id: el.id, start: b.x, size: b.w }
				: { id: el.id, start: b.y, size: b.h };
		})
		.sort((a, b) => a.start - b.start);
	if (items.length < 3) return elements;
	const first = items[0];
	const last = items[items.length - 1];
	const span = last.start + last.size - first.start;
	const total = items.reduce((sum, it) => sum + it.size, 0);
	const gap = (span - total) / (items.length - 1);
	const shifts = new Map<string, { dx: number; dy: number }>();
	let cursor = first.start;
	for (const it of items) {
		const d = cursor - it.start;
		shifts.set(it.id, axis === "x" ? { dx: d, dy: 0 } : { dx: 0, dy: d });
		cursor += it.size + gap;
	}
	return shiftEach(elements, shifts);
}

// X/Y общей рамки в инспекторе: вся группа едет так, чтобы рамка встала в точку
export function moveSelectionTo(
	elements: CutlineElement[],
	ids: string[],
	x: number,
	y: number,
): CutlineElement[] {
	const bounds = selectionBounds(elements.filter((el) => ids.includes(el.id)));
	if (!bounds) return elements;
	return offsetElements(elements, ids, x - bounds.x, y - bounds.y);
}
