// Автоподгонка текста в рамку. Режимы shrink/clip — порт логики из
// reference/badge-editor-v1.html (fit/clip). wrap там не было — сделан с нуля.

import type { FontWeight, TextFit } from "../model/document";
import { measureText } from "./measure";

export interface FitContext {
	fontFamily: string;
	weight: FontWeight;
	trackingMm: number;
	maxWidthMm: number;
}

function widthOf(text: string, sizeMm: number, ctx: FitContext): number {
	return measureText(text, sizeMm, ctx.trackingMm, ctx.fontFamily, ctx.weight)
		.widthMm;
}

function fitsAt(text: string, sizeMm: number, ctx: FitContext): boolean {
	return widthOf(text, sizeMm, ctx) <= ctx.maxWidthMm;
}

const SHRINK_STEP_MM = 0.1;

export function shrinkToFit(
	text: string,
	sizeMm: number,
	minSizeMm: number,
	ctx: FitContext,
): number {
	let size = sizeMm;
	while (size > minSizeMm && !fitsAt(text, size, ctx)) {
		size = Math.max(minSizeMm, size - SHRINK_STEP_MM);
	}
	return size;
}

export function clipToFit(
	text: string,
	sizeMm: number,
	ctx: FitContext,
): string {
	if (fitsAt(text, sizeMm, ctx)) {
		return text;
	}
	let clipped = text;
	while (clipped.length > 1 && !fitsAt(`${clipped}…`, sizeMm, ctx)) {
		clipped = clipped.slice(0, -1);
	}
	return `${clipped}…`;
}

// Перенос по словам в пределах ширины. Число строк высотой (h) пока не ограничивает —
// подсветка переполнения по вертикали появится в редакторе на Этапе 2/3, не здесь.
export function wrapToFit(
	text: string,
	sizeMm: number,
	ctx: FitContext,
): string[] {
	const words = text.split(/\s+/).filter(Boolean);
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

export interface FitResult {
	sizeMm: number;
	lines: string[];
}

// Применяет режим fit из модели документа к тексту (после подстановки плейсхолдеров).
export function applyFit(
	text: string,
	mode: TextFit,
	sizeMm: number,
	minSizeMm: number,
	ctx: FitContext,
): FitResult {
	switch (mode) {
		case "shrink": {
			const size = shrinkToFit(text, sizeMm, minSizeMm, ctx);
			return { sizeMm: size, lines: [clipToFit(text, size, ctx)] };
		}
		case "clip":
			return { sizeMm, lines: [clipToFit(text, sizeMm, ctx)] };
		case "wrap":
			return { sizeMm, lines: wrapToFit(text, sizeMm, ctx) };
		case "none":
			return { sizeMm, lines: [text] };
	}
}
