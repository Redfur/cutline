// Единственная точка, где документ превращается в картинку (docs/document-model.md).
// Чистая функция: не трогает DOM редактора, не читает состояние React — только модель,
// запись данных и опции на входе, строка SVG на выходе. На ней держатся превью, сетка
// миниатюр и все виды экспорта.

import { substitute } from "../data/placeholders";
import type {
	Canvas,
	CutlineDocument,
	CutlineElement,
	DataRecord,
	EllipseElement,
	ImageElement,
	LineElement,
	RectElement,
	TextAlign,
	TextElement,
	TextValign,
} from "../model/document";
import { layoutText } from "./layout";

export interface RenderOptions {
	outlines: boolean; // перевод текста в кривые — появится вместе с opentype.js на Этапе 4
	bleed: boolean; // расширить холст на вылет
	marks: boolean; // метки реза по углам обреза
}

function escapeXml(text: string): string {
	// Кавычки тоже экранируем: escapeXml подставляется и в атрибуты (href, font-family),
	// а не только в текстовое содержимое — без этого строка с " вываливалась бы из
	// атрибута наружу (например через свободное поле «Источник» у image-элемента).
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function textAnchorOf(align: TextAlign): "start" | "middle" | "end" {
	if (align === "center") return "middle";
	if (align === "right") return "end";
	return "start";
}

function anchorXOf(el: TextElement): number {
	if (el.align === "center") return el.x + el.w / 2;
	if (el.align === "right") return el.x + el.w;
	return el.x;
}

// Базовая линия первой строки для каждого valign. Ascent/descent берём из измерения
// самого текста — без реальных метрик шрифта точнее не получить, а для baseline (основной
// случай — им пользуется и перенесённый макет бейджа) метрики вовсе не нужны: y и есть baseline.
function firstBaselineY(
	valign: TextValign,
	y: number,
	h: number,
	ascentMm: number,
	blockHeightMm: number,
): number {
	switch (valign) {
		case "top":
			return y + ascentMm;
		case "middle":
			return y + h / 2 - blockHeightMm / 2 + ascentMm;
		case "baseline":
			return y;
	}
}

function renderText(
	el: TextElement,
	record: DataRecord,
	opts: RenderOptions,
): string {
	const layout = layoutText(el, record);
	if (!layout) {
		return "";
	}
	const { sizeMm, lines, lineHeightMm, ascentMm } = layout;
	const blockHeightMm = lineHeightMm * (lines.length - 1);
	const baseY = firstBaselineY(el.valign, el.y, el.h, ascentMm, blockHeightMm);
	const anchorX = anchorXOf(el);
	const anchor = textAnchorOf(el.align);

	// outlines: true задумано как перевод в контуры через opentype.js (см. Этап 4 роадмапа).
	// Пока такого источника глифов нет — печатаем обычным <text>, отличий от превью не будет
	// только на машине, где шрифт установлен.
	void opts.outlines;

	return lines
		.map((line, i) => {
			const y = baseY + lineHeightMm * i;
			return (
				`<text x="${anchorX}" y="${y}" font-family="${escapeXml(el.font)}"` +
				` font-weight="${el.weight === "bold" ? 700 : 400}" font-size="${sizeMm}"` +
				` fill="${el.color}" text-anchor="${anchor}"` +
				`${el.tracking ? ` letter-spacing="${el.tracking}"` : ""}>${escapeXml(line)}</text>`
			);
		})
		.join("");
}

function renderRect(el: RectElement): string {
	const parts = [
		`<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}"`,
	];
	if (el.radius) parts.push(` rx="${el.radius}"`);
	parts.push(` fill="${el.fill ?? "none"}"`);
	if (el.stroke)
		parts.push(` stroke="${el.stroke}" stroke-width="${el.strokeWidth}"`);
	parts.push("/>");
	return parts.join("");
}

function renderEllipse(el: EllipseElement): string {
	const cx = el.x + el.w / 2;
	const cy = el.y + el.h / 2;
	const parts = [
		`<ellipse cx="${cx}" cy="${cy}" rx="${el.w / 2}" ry="${el.h / 2}"`,
	];
	parts.push(` fill="${el.fill ?? "none"}"`);
	if (el.stroke)
		parts.push(` stroke="${el.stroke}" stroke-width="${el.strokeWidth}"`);
	parts.push("/>");
	return parts.join("");
}

function renderLine(el: LineElement): string {
	const stroke = el.stroke ?? "none";
	return (
		`<line x1="${el.x}" y1="${el.y}" x2="${el.x + el.w}" y2="${el.y + el.h}"` +
		` stroke="${stroke}" stroke-width="${el.strokeWidth}"/>`
	);
}

const IMAGE_FIT_TO_PRESERVE_ASPECT_RATIO: Record<ImageElement["fit"], string> =
	{
		cover: "xMidYMid slice",
		contain: "xMidYMid meet",
		fill: "none",
	};

function renderImage(el: ImageElement, record: DataRecord): string {
	const src = substitute(el.src, record);
	if (!src) {
		return "";
	}
	const preserveAspectRatio = IMAGE_FIT_TO_PRESERVE_ASPECT_RATIO[el.fit];
	return (
		`<image x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}"` +
		` href="${escapeXml(src)}" preserveAspectRatio="${preserveAspectRatio}"/>`
	);
}

function renderElement(
	el: CutlineElement,
	record: DataRecord,
	opts: RenderOptions,
): string {
	if (!el.visible) {
		return "";
	}
	const inner = (() => {
		switch (el.type) {
			case "text":
				return renderText(el, record, opts);
			case "rect":
				return renderRect(el);
			case "ellipse":
				return renderEllipse(el);
			case "line":
				return renderLine(el);
			case "image":
				return renderImage(el, record);
		}
	})();
	if (!inner) {
		return "";
	}
	const rotation = el.rotation
		? ` transform="rotate(${el.rotation} ${el.x + el.w / 2} ${el.y + el.h / 2})"`
		: "";
	return rotation ? `<g${rotation}>${inner}</g>` : inner;
}

function renderBackground(
	canvas: Canvas,
	originX: number,
	originY: number,
	width: number,
	height: number,
): string {
	if (canvas.background === "transparent") {
		return "";
	}
	return `<rect x="${originX}" y="${originY}" width="${width}" height="${height}" fill="${canvas.background}"/>`;
}

const MARK_LENGTH_MM = 5;
const MARK_GAP_MM = 2;

// Первая версия меток реза: по два штриха на угол, от края вылета наружу.
// Точная геометрия под типографскую печать — предмет Этапа 4, не этого шага.
function renderCropMarks(canvas: Canvas, bleed: number): string {
	const { w, h } = canvas;
	const corners = [
		{ x: 0, y: 0, dx: -1, dy: -1 },
		{ x: w, y: 0, dx: 1, dy: -1 },
		{ x: 0, y: h, dx: -1, dy: 1 },
		{ x: w, y: h, dx: 1, dy: 1 },
	];
	const marks = corners.flatMap(({ x, y, dx, dy }) => {
		const start = bleed + MARK_GAP_MM;
		const end = start + MARK_LENGTH_MM;
		return [
			`<line x1="${x + dx * start}" y1="${y}" x2="${x + dx * end}" y2="${y}" stroke="#000000" stroke-width="0.1"/>`,
			`<line x1="${x}" y1="${y + dy * start}" x2="${x}" y2="${y + dy * end}" stroke="#000000" stroke-width="0.1"/>`,
		];
	});
	return marks.join("");
}

export interface RenderedSize {
	widthMm: number;
	heightMm: number;
}

// Итоговый размер SVG с учётом вылета — экспорту в PNG нужно то же самое число,
// без него пришлось бы дублировать этот расчёт на стороне вызывающего кода.
export function renderedSize(
	canvas: Canvas,
	opts: RenderOptions,
): RenderedSize {
	const bleed = opts.bleed ? canvas.bleed : 0;
	return { widthMm: canvas.w + bleed * 2, heightMm: canvas.h + bleed * 2 };
}

export function render(
	doc: CutlineDocument,
	record: DataRecord,
	opts: RenderOptions,
): string {
	const { canvas } = doc;
	const bleed = opts.bleed ? canvas.bleed : 0;
	const originX = -bleed;
	const originY = -bleed;
	const { widthMm: width, heightMm: height } = renderedSize(canvas, opts);

	const background = renderBackground(canvas, originX, originY, width, height);
	const elements = doc.elements
		.map((el) => renderElement(el, record, opts))
		.join("");
	const marks = opts.marks ? renderCropMarks(canvas, bleed) : "";

	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm"` +
		` viewBox="${originX} ${originY} ${width} ${height}">` +
		`${background}${elements}${marks}</svg>`
	);
}
