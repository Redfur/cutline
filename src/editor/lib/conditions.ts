// Условие показа в инспекторе — у одного элемента и у нескольких выделенных сразу
// (текст + плашка + кружок получают одно условие одним шагом undo). Решения без JSX.
import { conditionResult } from "../../data/conditions";
import {
	placeholderKeys,
	type Scope,
	templateOf,
} from "../../data/placeholders";
import type {
	CutlineDocument,
	CutlineElement,
	ShowCondition,
} from "../../model/document";

export interface SharedCondition {
	// у всех одинаковое — оно; разные — первое заданное, чтобы было что править
	condition: ShowCondition | null;
	mixed: boolean;
}

function sameCondition(a: ShowCondition | null, b: ShowCondition | null) {
	return a === b || (!!a && !!b && a.value === b.value && a.when === b.when);
}

export function sharedCondition(elements: CutlineElement[]): SharedCondition {
	const first = elements[0]?.condition ?? null;
	const mixed = elements.some((el) => !sameCondition(el.condition, first));
	return {
		condition: mixed
			? (elements.find((el) => el.condition)?.condition ?? null)
			: first,
		mixed,
	};
}

// Что поставить в только что включённое условие: первое поле содержимого. Текст
// {{Должность}} сразу получает «показывать, если Должность заполнено» — ради этого
// условие обычно и включают
export function suggestConditionValue(elements: CutlineElement[]): string {
	for (const el of elements) {
		const template = templateOf(el);
		const key = template === null ? undefined : placeholderKeys(template)[0];
		if (key) return `{{${key}}}`;
	}
	return "";
}

// Заблокированные не меняются — как и при групповом сдвиге
export function setCondition(
	elements: CutlineElement[],
	ids: string[],
	condition: ShowCondition | null,
): CutlineElement[] {
	return elements.map((el) =>
		ids.includes(el.id) && !el.locked ? { ...el, condition } : el,
	);
}

// Призрак на холсте: документ только из элементов, скрытых условием в этой записи, —
// им условие снято, остальные спрятаны, фон прозрачный. Холст рисует его тем же
// render() полупрозрачным слоем: render() про призраки не знает. null — скрытых нет
export function conditionGhostDocument(
	doc: CutlineDocument,
	scope: Scope,
): CutlineDocument | null {
	const hidden = new Set(
		doc.elements
			.filter((el) => el.visible && !conditionResult(el, scope).shown)
			.map((el) => el.id),
	);
	if (!hidden.size) return null;
	return {
		...doc,
		canvas: { ...doc.canvas, background: "transparent" },
		elements: doc.elements.map((el) =>
			hidden.has(el.id)
				? { ...el, condition: null }
				: { ...el, visible: false },
		),
	};
}
