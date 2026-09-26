// Спуск полос: где на странице PDF стоят карточки и где метки реза. Чистые функции —
// экспорт только подставляет сюда SVG записей.
//
// Метки — свойство листа, а не карточки: на листе с несколькими карточками линии реза
// общие для колонки/строки, и рисуются они снаружи всего блока, а не у каждой карточки.
// Поэтому их нет в render().
//
// Как в макете экспорта, поворачивается лист (книжный/альбомный), а не карточки:
// карточки на листе всегда стоят прямо — так лист проще проверить глазами.
import type { Box, Matrix } from "./svgToPdfOps";

export interface CardSize {
	w: number; // мм, обрез
	h: number;
	bleed: number; // вылет документа
}

export interface SheetFormat {
	name: string;
	w: number; // мм, в книжной ориентации
	h: number;
}

export const SHEETS: SheetFormat[] = [
	{ name: "A4", w: 210, h: 297 },
	{ name: "A3", w: 297, h: 420 },
	// SRA3 — типографский лист под A3 с запасом на вылеты и метки
	{ name: "SRA3", w: 320, h: 450 },
];

// Метка начинается в 2 мм за краем вылета (чтобы нож, ушедший в вылет, её не задел)
// и тянется на 5 мм
export const MARK_GAP_MM = 2;
export const MARK_LENGTH_MM = 5;
export const MARK_ZONE_MM = MARK_GAP_MM + MARK_LENGTH_MM;
// ~0,28 pt — обычная толщина меток реза
export const MARK_STROKE_MM = 0.1;
// Домашние принтеры не печатают 3–5 мм у края листа
export const HOME_MARGIN_MM = 5;

export interface ImposeSettings {
	// null — одна карточка на странице размером с карточку
	sheet: SheetFormat | null;
	bleed: boolean;
	marks: boolean;
	// поля 5 мм под домашний принтер
	homeMargin: boolean;
	// с полями влезает меньше, чем без них, — уменьшить карточки, чтобы уместить столько же
	fitToMargin: boolean;
}

export interface SheetFit {
	cols: number;
	rows: number;
	landscape: boolean;
	scale: number;
	perSheet: number;
	// размер страницы с учётом ориентации
	widthMm: number;
	heightMm: number;
}

export interface Line {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

export interface Slot {
	// обрез карточки на странице (с учётом масштаба)
	trim: Box;
	// из координат SVG карточки (обрез от 0,0) в координаты страницы
	transform: Matrix;
}

export interface PageLayout {
	widthMm: number;
	heightMm: number;
	slots: Slot[];
	marks: Line[];
	// у страницы на одну карточку — её обрез и вылет; у листа нет: лист режут по меткам
	trim?: Box;
	bleed?: Box;
}

// Допуск на float: A6 на A4 встык — 2 × 148 = 296 ≤ 297, а 105 · 2 = 210 ровно
const EPS = 1e-6;

function bleedOf(card: CardSize, settings: ImposeSettings): number {
	return settings.bleed ? card.bleed : 0;
}

function zoneOf(settings: ImposeSettings): number {
	return settings.marks ? MARK_ZONE_MM : 0;
}

// Лучшая ориентация листа для данных полей; при равенстве — книжная
function bestFit(
	card: CardSize,
	sheet: SheetFormat,
	bleed: number,
	zone: number,
	margin: number,
): SheetFit {
	const variants = [
		{ landscape: false, w: sheet.w, h: sheet.h },
		{ landscape: true, w: sheet.h, h: sheet.w },
	].map((o) => {
		const availW = o.w - 2 * margin - 2 * zone;
		const availH = o.h - 2 * margin - 2 * zone;
		const cols = Math.max(0, Math.floor(availW / (card.w + 2 * bleed) + EPS));
		const rows = Math.max(0, Math.floor(availH / (card.h + 2 * bleed) + EPS));
		return {
			cols,
			rows,
			landscape: o.landscape,
			scale: 1,
			perSheet: cols * rows,
			widthMm: o.w,
			heightMm: o.h,
		};
	});
	const [portrait, landscape] = variants;
	return landscape.perSheet > portrait.perSheet ? landscape : portrait;
}

// Уменьшение, при котором раскладка листа без полей помещается в поля
function scaleIntoMargin(
	card: CardSize,
	full: SheetFit,
	bleed: number,
	zone: number,
): number {
	const availW = full.widthMm - 2 * HOME_MARGIN_MM - 2 * zone;
	const availH = full.heightMm - 2 * HOME_MARGIN_MM - 2 * zone;
	return Math.min(
		availW / (full.cols * (card.w + 2 * bleed)),
		availH / (full.rows * (card.h + 2 * bleed)),
		1,
	);
}

// Сколько карточек встаёт на лист и в какой ориентации. Без листа — одна на странице.
export function sheetFit(card: CardSize, settings: ImposeSettings): SheetFit {
	const bleed = bleedOf(card, settings);
	const zone = zoneOf(settings);
	const { sheet } = settings;
	if (!sheet) {
		const offset = zone + bleed;
		return {
			cols: 1,
			rows: 1,
			landscape: false,
			scale: 1,
			perSheet: 1,
			widthMm: card.w + 2 * offset,
			heightMm: card.h + 2 * offset,
		};
	}
	if (!settings.homeMargin) return bestFit(card, sheet, bleed, zone, 0);
	const withMargin = bestFit(card, sheet, bleed, zone, HOME_MARGIN_MM);
	if (!settings.fitToMargin) return withMargin;
	const full = bestFit(card, sheet, bleed, zone, 0);
	if (full.perSheet <= withMargin.perSheet) return withMargin;
	return { ...full, scale: scaleIntoMargin(card, full, bleed, zone) };
}

export interface MarginHint {
	withMargin: number;
	withoutMargin: number;
	// уменьшение, при котором с полями встаёт столько же, сколько без них
	scale: number;
}

// Подсказка к «Полям для домашнего принтера»: поля отняли карточки — можно вернуть их
// уменьшением. Четыре A6 на A4 встык не оставляют места под поля (CLAUDE.md).
export function homeMarginHint(
	card: CardSize,
	settings: ImposeSettings,
): MarginHint | null {
	const { sheet } = settings;
	if (!sheet || !settings.homeMargin) return null;
	const bleed = bleedOf(card, settings);
	const zone = zoneOf(settings);
	const withMargin = bestFit(card, sheet, bleed, zone, HOME_MARGIN_MM);
	const full = bestFit(card, sheet, bleed, zone, 0);
	if (full.perSheet <= withMargin.perSheet) return null;
	return {
		withMargin: withMargin.perSheet,
		withoutMargin: full.perSheet,
		scale: scaleIntoMargin(card, full, bleed, zone),
	};
}

function slotAt(card: CardSize, x: number, y: number, scale: number): Slot {
	return {
		trim: { x, y, w: card.w * scale, h: card.h * scale },
		transform: [scale, 0, 0, scale, x, y],
	};
}

function uniqueSorted(values: number[]): number[] {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted.filter((v, i) => i === 0 || v - sorted[i - 1] > EPS);
}

// Метки по каждой линии реза, снаружи блока карточек: вертикальные резы — сверху и
// снизу, горизонтальные — слева и справа. Встык у соседних карточек линия общая.
export function cropMarks(slots: Slot[], bleed: number): Line[] {
	if (!slots.length) return [];
	const xs = uniqueSorted(
		slots.flatMap((s) => [s.trim.x, s.trim.x + s.trim.w]),
	);
	const ys = uniqueSorted(
		slots.flatMap((s) => [s.trim.y, s.trim.y + s.trim.h]),
	);
	const top = ys[0] - bleed - MARK_GAP_MM;
	const bottom = ys[ys.length - 1] + bleed + MARK_GAP_MM;
	const left = xs[0] - bleed - MARK_GAP_MM;
	const right = xs[xs.length - 1] + bleed + MARK_GAP_MM;
	return [
		...xs.flatMap((x) => [
			{ x1: x, y1: top, x2: x, y2: top - MARK_LENGTH_MM },
			{ x1: x, y1: bottom, x2: x, y2: bottom + MARK_LENGTH_MM },
		]),
		...ys.flatMap((y) => [
			{ x1: left, y1: y, x2: left - MARK_LENGTH_MM, y2: y },
			{ x1: right, y1: y, x2: right + MARK_LENGTH_MM, y2: y },
		]),
	];
}

// Страница для выбранных настроек: все места под карточки и метки. Последний лист
// тиража может заполниться не целиком — метки на нём те же.
export function pageLayout(
	card: CardSize,
	settings: ImposeSettings,
): PageLayout {
	const bleed = bleedOf(card, settings);
	const fit = sheetFit(card, settings);
	if (!settings.sheet) {
		const offset = zoneOf(settings) + bleed;
		const slot = slotAt(card, offset, offset, 1);
		return {
			widthMm: fit.widthMm,
			heightMm: fit.heightMm,
			slots: [slot],
			marks: settings.marks ? cropMarks([slot], bleed) : [],
			trim: slot.trim,
			bleed: {
				x: offset - bleed,
				y: offset - bleed,
				w: card.w + 2 * bleed,
				h: card.h + 2 * bleed,
			},
		};
	}
	const { scale } = fit;
	const cellW = (card.w + 2 * bleed) * scale;
	const cellH = (card.h + 2 * bleed) * scale;
	const originX = (fit.widthMm - fit.cols * cellW) / 2;
	const originY = (fit.heightMm - fit.rows * cellH) / 2;
	const slots: Slot[] = [];
	for (let row = 0; row < fit.rows; row++) {
		for (let col = 0; col < fit.cols; col++) {
			slots.push(
				slotAt(
					card,
					originX + col * cellW + bleed * scale,
					originY + row * cellH + bleed * scale,
					scale,
				),
			);
		}
	}
	return {
		widthMm: fit.widthMm,
		heightMm: fit.heightMm,
		slots,
		marks: settings.marks ? cropMarks(slots, bleed * scale) : [],
	};
}
