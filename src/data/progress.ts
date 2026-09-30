// Доля заполнения прямоугольника по данным (RectElement.progress): «75», «75 %»,
// «12,5» → 0.75, 0.125. Одна функция на render() и проблемы записи — что нарисовано,
// то и проверено. Шаблон разбирает evaluate(), второго разбора нет.
import {
	evaluate,
	type PlaceholderError,
	placeholderKeys,
	type Scope,
} from "./placeholders";

export interface ProgressValue {
	// 0–1, уже зажата в границы
	fraction: number;
	errors: PlaceholderError[];
}

const NUMBER_RE = /^-?\d+(?:\.\d+)?$/;

export function progressFraction(
	template: string,
	scope: Scope,
): ProgressValue {
	const { text, errors } = evaluate(template, scope);
	// \s в JS ловит и неразрывные пробелы: число из таблицы бывает с разрядами
	const normalized = text
		.replace(/\s/g, "")
		.replace(/%$/, "")
		.replace(",", ".");
	// пустая ячейка — уже проблема «пусто», вторая к ней ничего не добавит
	if (!normalized) return { fraction: 0, errors };
	const fail = (message: string): PlaceholderError => ({
		message,
		keys: placeholderKeys(template),
		static: false,
	});
	if (!NUMBER_RE.test(normalized)) {
		return {
			fraction: 0,
			errors: [...errors, fail(`Заполнение: «${text}» — не число`)],
		};
	}
	const pct = Number(normalized);
	const fraction = Math.min(1, Math.max(0, pct / 100));
	// 120% — скорее опечатка в таблице, чем замысел: рисуем по границе, но отмечаем запись
	if (pct < 0 || pct > 100) {
		return {
			fraction,
			errors: [...errors, fail(`Заполнение: ${text} — нужно от 0 до 100`)],
		};
	}
	return { fraction, errors };
}
