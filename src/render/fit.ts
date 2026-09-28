// Подгонка текста в рамку по правилам элемента (v7). Однострочный: уменьшить кегль
// и/или обрезать с «…». Блок: перенос по словам и по \n, лимит строк, уменьшение кегля
// и «…» в конце последней строки. Правила комбинируются: сначала уменьшаем до минимума,
// что не влезло и там — обрезаем. Уменьшение и обрезка — порт логики из
// reference/badge-editor-v1.html (fit/clip), перенос сделан с нуля.

import type { FontWeight } from "../model/document";
import { measureText } from "./measure";

export interface FitContext {
	fontFamily: string;
	weight: FontWeight;
	trackingMm: number;
	maxWidthMm: number;
}

export interface FitResult {
	sizeMm: number;
	lines: string[];
	// не влезло так, как задумано: обрезано многоточием, шире рамки или строк больше лимита
	overflow: boolean;
}

// Допуск на сравнение мм: ширины приходят из canvas во float, а на печати
// сотая миллиметра не видна — ложная тревога от 1e-12 хуже.
const EPS_MM = 0.01;
const ELLIPSIS = "…";

function widthOf(text: string, sizeMm: number, ctx: FitContext): number {
	return measureText(text, sizeMm, ctx.trackingMm, ctx.fontFamily, ctx.weight)
		.widthMm;
}

function fitsAt(text: string, sizeMm: number, ctx: FitContext): boolean {
	return widthOf(text, sizeMm, ctx) <= ctx.maxWidthMm;
}

const SHRINK_STEP_MM = 0.1;
// 0.1 во float неточен, и вычитание шага раз за разом копит ошибку: за 10 шагов от 5
// выходит 4.0000000000000036. Это и лишний шаг на границе (ширина на 1e-15 больше
// допустимой — «не влезло»), и хвост из 15 знаков в font-size экспортированного SVG.
// Округляем каждый шаг до 1e-6 мм — на порядки точнее, чем что-либо на печати.
const SIZE_PRECISION = 1e6;

// Уменьшаем кегль шагами, пока fits не скажет «влезло», но не ниже минимума
function shrinkUntil(
	sizeMm: number,
	minSizeMm: number,
	fits: (sizeMm: number) => boolean,
): number {
	let size = sizeMm;
	while (size > minSizeMm && !fits(size)) {
		const next =
			Math.round((size - SHRINK_STEP_MM) * SIZE_PRECISION) / SIZE_PRECISION;
		size = Math.max(minSizeMm, next);
	}
	return size;
}

export function shrinkToFit(
	text: string,
	sizeMm: number,
	minSizeMm: number,
	ctx: FitContext,
): number {
	return shrinkUntil(sizeMm, minSizeMm, (size) => fitsAt(text, size, ctx));
}

export function clipToFit(
	text: string,
	sizeMm: number,
	ctx: FitContext,
): string {
	if (fitsAt(text, sizeMm, ctx)) {
		return text;
	}
	return withEllipsis(text, sizeMm, ctx);
}

// «…» в конец, укорачивая текст, пока строка с ним не влезет. Хвостовые пробелы
// убираем, чтобы не выходило «Анна …». Минимум — один символ перед «…»
function withEllipsis(text: string, sizeMm: number, ctx: FitContext): string {
	let clipped = text.trimEnd();
	while (clipped.length > 1 && !fitsAt(`${clipped}${ELLIPSIS}`, sizeMm, ctx)) {
		clipped = clipped.slice(0, -1).trimEnd();
	}
	return `${clipped}${ELLIPSIS}`;
}

// Слово шире строки режется по символам: иначе одно длинное слово (адрес почты,
// ссылка) вылезало бы за рамку. Кусок — сколько символов влезает, минимум один
function breakWord(word: string, sizeMm: number, ctx: FitContext): string[] {
	const chunks: string[] = [];
	let rest = word;
	while (rest && !fitsAt(rest, sizeMm, ctx)) {
		let n = 1;
		while (n < rest.length && fitsAt(rest.slice(0, n + 1), sizeMm, ctx)) n++;
		chunks.push(rest.slice(0, n));
		rest = rest.slice(n);
	}
	if (rest) chunks.push(rest);
	return chunks;
}

// Абзац — перенос по словам в пределах ширины; слово шире строки — по символам
function wrapParagraph(
	paragraph: string,
	sizeMm: number,
	ctx: FitContext,
): string[] {
	const words = paragraph
		.split(/\s+/)
		.filter(Boolean)
		.flatMap((word) => breakWord(word, sizeMm, ctx));
	if (words.length === 0) {
		return [""];
	}
	const lines: string[] = [];
	let current = words[0];
	for (const word of words.slice(1)) {
		const candidate = `${current} ${word}`;
		if (fitsAt(candidate, sizeMm, ctx)) {
			current = candidate;
		} else {
			lines.push(current);
			current = word;
		}
	}
	lines.push(current);
	return lines;
}

// Ручные переносы (\n) — отдельные абзацы, пустой абзац — пустая строка
export function wrapToFit(
	text: string,
	sizeMm: number,
	ctx: FitContext,
): string[] {
	return text
		.split("\n")
		.flatMap((paragraph) => wrapParagraph(paragraph, sizeMm, ctx));
}

export interface LineRules {
	shrink: boolean;
	ellipsis: boolean;
	minSizeMm: number;
}

// Однострочный: переносов нет, ручные переносы уже заменены пробелом (layoutText)
export function fitLine(
	text: string,
	sizeMm: number,
	rules: LineRules,
	ctx: FitContext,
): FitResult {
	const size = rules.shrink
		? shrinkToFit(text, sizeMm, rules.minSizeMm, ctx)
		: sizeMm;
	const line = rules.ellipsis ? clipToFit(text, size, ctx) : text;
	const overflow =
		line !== text || widthOf(line, size, ctx) > ctx.maxWidthMm + EPS_MM;
	return { sizeMm: size, lines: [line], overflow };
}

export interface BlockRules extends LineRules {
	// null — лимит по высоте рамки
	maxLines: number | null;
	heightMm: number;
	// межстрочный — множитель кегля: при уменьшении кегля в ту же высоту входит больше строк
	lineHeight: number;
}

// Сколько строк разрешено. Без maxLines — сколько строк по lineHeight входит в высоту
// рамки (так же считалось переполнение по высоте до v7), минимум одна: у выравнивания
// по базовой линии высота рамки не описывает высоту одной строки
export function lineLimit(rules: BlockRules, sizeMm: number): number {
	if (rules.maxLines !== null) return Math.max(1, rules.maxLines);
	const lineMm = sizeMm * rules.lineHeight;
	return Math.max(1, Math.floor((rules.heightMm + EPS_MM) / lineMm));
}

export function fitBlock(
	text: string,
	sizeMm: number,
	rules: BlockRules,
	ctx: FitContext,
): FitResult {
	const fits = (size: number) =>
		wrapToFit(text, size, ctx).length <= lineLimit(rules, size);
	const size = rules.shrink
		? shrinkUntil(sizeMm, rules.minSizeMm, fits)
		: sizeMm;
	const wrapped = wrapToFit(text, size, ctx);
	const limit = lineLimit(rules, size);
	// символ шире строки не делится — единственное, что ещё может вылезти по ширине
	const tooWide = wrapped.some(
		(line) => widthOf(line, size, ctx) > ctx.maxWidthMm + EPS_MM,
	);
	if (wrapped.length <= limit) {
		return { sizeMm: size, lines: wrapped, overflow: tooWide };
	}
	if (!rules.ellipsis) {
		return { sizeMm: size, lines: wrapped, overflow: true };
	}
	const kept = wrapped.slice(0, limit);
	// лимит пришёлся на пустую строку — «…» одно на строке выглядит как мусор, ставим
	// его в конец последней непустой
	while (kept.length > 1 && kept[kept.length - 1] === "") kept.pop();
	const last = kept.length - 1;
	kept[last] = withEllipsis(kept[last], size, ctx);
	return { sizeMm: size, lines: kept, overflow: true };
}
