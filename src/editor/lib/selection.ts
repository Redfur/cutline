// Выделение нескольких элементов — состояние редактора (EditorShell), не документа:
// список id в порядке выделения. Здесь — переходы и геометрия выделения без React.
import type { CutlineElement } from "../../model/document";
import { type Bounds, boundsOf } from "./geometry";

// Shift-клик на холсте, ⌘-клик в слоях
export function toggleSelection(ids: string[], id: string): string[] {
	return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

// Shift-клик в слоях: всё от якоря (последний кликнутый) до строки включительно, в
// порядке списка. Якоря нет или он пропал из списка — только сама строка
export function rangeSelection(
	order: string[],
	anchor: string | null,
	id: string,
): string[] {
	const from = anchor === null ? -1 : order.indexOf(anchor);
	const to = order.indexOf(id);
	if (from === -1 || to === -1) return [id];
	const [a, b] = from < to ? [from, to] : [to, from];
	return order.slice(a, b + 1);
}

// Рамка мышью берёт всё, что она задела, а не только целиком накрытое — как в Фигме:
// на плотном макете охватить элемент полностью, не зацепив фон, почти нельзя.
// Скрытые не видны, заблокированные не должны двигаться — их рамка пропускает
// (выделить их можно в слоях).
export function elementsInRect(
	elements: CutlineElement[],
	rect: Bounds,
): string[] {
	return elements
		.filter((el) => el.visible && !el.locked)
		.filter((el) => {
			const b = boundsOf(el);
			return (
				b.x <= rect.x + rect.w &&
				b.x + b.w >= rect.x &&
				b.y <= rect.y + rect.h &&
				b.y + b.h >= rect.y
			);
		})
		.map((el) => el.id);
}

export function selectionBounds(
	elements: Pick<CutlineElement, "x" | "y" | "w" | "h">[],
): Bounds | null {
	if (elements.length === 0) return null;
	const boxes = elements.map(boundsOf);
	const x = Math.min(...boxes.map((b) => b.x));
	const y = Math.min(...boxes.map((b) => b.y));
	const right = Math.max(...boxes.map((b) => b.x + b.w));
	const bottom = Math.max(...boxes.map((b) => b.y + b.h));
	return { x, y, w: right - x, h: bottom - y };
}
