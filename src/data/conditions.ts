// Показ элемента по данным (ElementBase.condition): плашка под {{Должность}} исчезает
// вместе с пустым полем. Одна функция на render(), проблемы записи и призрак на холсте —
// что напечатано, то и проверено. Шаблон разбирает evaluate(), второго разбора нет.
import type { CutlineElement } from "../model/document";
import { evaluate, type PlaceholderError, type Scope } from "./placeholders";

export interface ConditionResult {
	shown: boolean;
	// ошибки функций в условии: упавшая функция даёт пустоту, как в тексте
	errors: PlaceholderError[];
}

const ALWAYS: ConditionResult = { shown: true, errors: [] };

// Только условие, без visible: глаз в слоях — решение макета, а не данных
export function conditionResult(
	el: CutlineElement,
	scope: Scope,
): ConditionResult {
	if (!el.condition) return ALWAYS;
	const { text, errors } = evaluate(el.condition.value, scope);
	const filled = text.trim() !== "";
	return {
		shown: el.condition.when === "filled" ? filled : !filled,
		errors,
	};
}

export function isShown(el: CutlineElement, scope: Scope): boolean {
	return el.visible && conditionResult(el, scope).shown;
}
