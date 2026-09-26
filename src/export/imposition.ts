// Спуск полос: где на странице PDF стоят карточки и где метки реза. Чистые функции —
// экспорт только подставляет сюда SVG записей.
//
// Метки — свойство листа, а не карточки: на листе с несколькими карточками линии реза
// общие для колонки/строки, и рисуются они снаружи всего блока, а не у каждой карточки.
// Поэтому их нет в render().
import type { Box, Matrix } from "./svgToPdfOps";

export interface CardSize {
	w: number; // мм, обрез
	h: number;
	bleed: number; // вылет документа
}

export interface SheetFormat {
	name: string;
	w: number;
	h: number;
}

export const SHEETS: SheetFormat[] = [
	{ name: "A4", w: 210, h: 297 },
	{ name: "A3", w: 297, h: 420 },
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

export interface LayoutOption {
	id: string;
	sheet: SheetFormat | null; // null — одна карточка на странице размером с карточку
	// поля под домашний принтер (HOME_MARGIN_MM); 0 — лист для типографии
	margin: number;
	perPage: number;
	scale: number;
}

export interface Line {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

export interface Slot {
	// обрез карточки на странице (с учётом поворота и масштаба)
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

interface Grid {
	cols: number;
	rows: number;
	rotated: boolean;
}

// Допуск на float: A6 на A4 встык — 2 × 148 = 296 ≤ 297, но 105 · 2 = 210 ровно
const EPS = 1e-6;

function cellOf(
	card: CardSize,
	bleed: number,
	rotated: boolean,
	scale: number,
) {
	const w = (card.w + 2 * bleed) * scale;
	const h = (card.h + 2 * bleed) * scale;
	return rotated ? { w: h, h: w } : { w, h };
}

function fitGrid(
	card: CardSize,
	bleed: number,
	availW: number,
	availH: number,
): Grid {
	let best: Grid = { cols: 0, rows: 0, rotated: false };
	for (const rotated of [false, true]) {
		const cell = cellOf(card, bleed, rotated, 1);
		const cols = Math.floor(availW / cell.w + EPS);
		const rows = Math.floor(availH / cell.h + EPS);
		// при равенстве — без поворота: карточку на листе проще проверить глазами
		if (cols * rows > best.cols * best.rows) best = { cols, rows, rotated };
	}
	return best;
}

interface Arrangement extends Grid {
	scale: number;
}

function arrange(
	card: CardSize,
	sheet: SheetFormat,
	margin: number,
	printMarks: boolean,
): Arrangement {
	const bleed = printMarks ? card.bleed : 0;
	const zone = printMarks ? MARK_ZONE_MM : 0;
	const availW = sheet.w - 2 * margin - 2 * zone;
	const availH = sheet.h - 2 * margin - 2 * zone;
	const grid = fitGrid(card, bleed, availW, availH);
	if (!margin) return { ...grid, scale: 1 };
	// С полями влезает меньше, чем на лист без полей, — уменьшаем, чтобы уместить
	// столько же: четыре A6 на A4 встык не оставляют места под поля принтера
	const full = arrange(card, sheet, 0, printMarks);
	if (grid.cols * grid.rows >= full.cols * full.rows)
		return { ...grid, scale: 1 };
	const cell = cellOf(card, bleed, full.rotated, 1);
	const scale = Math.min(
		availW / (full.cols * cell.w),
		availH / (full.rows * cell.h),
		1,
	);
	return { ...full, scale };
}

// Варианты раскладки для диалога экспорта. Лист, на который не встаёт ни одной
// карточки, не предлагается; «для домашнего принтера» — только если поля что-то меняют.
export function layoutOptions(
	card: CardSize,
	printMarks: boolean,
): LayoutOption[] {
	const options: LayoutOption[] = [
		{
			id: "single",
			sheet: null,
			margin: 0,
			perPage: 1,
			scale: 1,
		},
	];
	for (const sheet of SHEETS) {
		const full = arrange(card, sheet, 0, printMarks);
		const perSheet = full.cols * full.rows;
		if (!perSheet) continue;
		options.push({
			id: sheet.name,
			sheet,
			margin: 0,
			perPage: perSheet,
			scale: 1,
		});
		const home = arrange(card, sheet, HOME_MARGIN_MM, printMarks);
		const perHome = home.cols * home.rows;
		const fitsAsIs =
			home.scale === 1 &&
			perHome === perSheet &&
			blockFitsMargin(card, sheet, full, printMarks);
		if (!perHome || fitsAsIs) continue;
		options.push({
			id: `${sheet.name}-home`,
			sheet,
			margin: HOME_MARGIN_MM,
			perPage: perHome,
			scale: home.scale,
		});
	}
	return options;
}

// Блок, разложенный без полей, и так отстоит от края на поле принтера — отдельный
// «домашний» вариант был бы копией
function blockFitsMargin(
	card: CardSize,
	sheet: SheetFormat,
	grid: Grid,
	printMarks: boolean,
): boolean {
	const bleed = printMarks ? card.bleed : 0;
	const zone = printMarks ? MARK_ZONE_MM : 0;
	const cell = cellOf(card, bleed, grid.rotated, 1);
	const freeW = (sheet.w - grid.cols * cell.w) / 2 - zone;
	const freeH = (sheet.h - grid.rows * cell.h) / 2 - zone;
	return freeW + EPS >= HOME_MARGIN_MM && freeH + EPS >= HOME_MARGIN_MM;
}

function slotAt(
	card: CardSize,
	trimX: number,
	trimY: number,
	rotated: boolean,
	scale: number,
): Slot {
	const w = (rotated ? card.h : card.w) * scale;
	const h = (rotated ? card.w : card.h) * scale;
	// поворот на 90° по часовой: верх карточки уходит вправо, (0,0) — в правый верхний угол
	const transform: Matrix = rotated
		? [0, scale, -scale, 0, trimX + card.h * scale, trimY]
		: [scale, 0, 0, scale, trimX, trimY];
	return { trim: { x: trimX, y: trimY, w, h }, transform };
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

// Страница для выбранного варианта: все места под карточки и метки. Последний лист
// тиража может заполниться не целиком — метки на нём те же.
export function pageLayout(
	card: CardSize,
	option: LayoutOption,
	printMarks: boolean,
): PageLayout {
	const bleed = printMarks ? card.bleed : 0;
	const zone = printMarks ? MARK_ZONE_MM : 0;
	if (!option.sheet) {
		const offset = zone + bleed;
		const slot = slotAt(card, offset, offset, false, 1);
		return {
			widthMm: card.w + 2 * offset,
			heightMm: card.h + 2 * offset,
			slots: [slot],
			marks: printMarks ? cropMarks([slot], bleed) : [],
			trim: slot.trim,
			bleed: {
				x: slot.trim.x - bleed,
				y: slot.trim.y - bleed,
				w: slot.trim.w + 2 * bleed,
				h: slot.trim.h + 2 * bleed,
			},
		};
	}
	const { sheet } = option;
	const { cols, rows, rotated, scale } = arrange(
		card,
		sheet,
		option.margin,
		printMarks,
	);
	const cell = cellOf(card, bleed, rotated, scale);
	const originX = (sheet.w - cols * cell.w) / 2;
	const originY = (sheet.h - rows * cell.h) / 2;
	const slots: Slot[] = [];
	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			slots.push(
				slotAt(
					card,
					originX + col * cell.w + bleed * scale,
					originY + row * cell.h + bleed * scale,
					rotated,
					scale,
				),
			);
		}
	}
	return {
		widthMm: sheet.w,
		heightMm: sheet.h,
		slots,
		marks: printMarks ? cropMarks(slots, bleed * scale) : [],
	};
}
