// Единственная точка, где документ превращается в картинку (docs/document-model.md).
// Чистая функция: не трогает DOM редактора, не читает состояние React — только модель,
// запись данных и опции на входе, строка SVG на выходе. На ней держатся превью, сетка
// миниатюр и все виды экспорта.

import { imageSource, type Scope } from "../data/placeholders";
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
} from "../model/document";
import { firstBaselineY, layoutText } from "./layout";
import { type OutlineFonts, textPathData } from "./outline";
import { qrPathData } from "./qr";

export interface RenderOptions {
	// шрифты для перевода текста в кривые; null — обычный <text> (экран, SVG). Текст
	// шрифтом, которого тут нет, остаётся <text>: PDF такое отсекает до вызова render()
	outlines: OutlineFonts | null;
	bleed: boolean; // расширить холст на вылет
	// номер записи с 1 — для {{ n() }}; у холста — текущая запись, у экспорта — номер
	// в таблице, а не в выборке
	n: number;
	// редактор (холст, миниатюры): пустой слот картинки и не загрузившаяся ссылка
	// рисуются заглушкой, чтобы их было видно. У экспорта — null: заглушка не печатается.
	// Что сломано, render() узнать не может (он синхронный и не ходит в сеть) — набор
	// приходит аргументом, как шрифты для кривых
	preview: ImagePreview | null;
	// меток реза тут нет: это свойство листа, а не карточки — их рисует спуск полос
	// (src/export/imposition.ts)
}

export interface ImagePreview {
	brokenImages: ReadonlySet<string>;
}

// Заглушки пустых слотов без проверки ссылок — для превью, где загрузку не ждём
// (стартовый экран, список документов)
export const PREVIEW_NO_CHECK: ImagePreview = { brokenImages: new Set() };

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

function renderText(
	el: TextElement,
	scope: Scope,
	opts: RenderOptions,
): string {
	const layout = layoutText(el, scope);
	if (!layout) {
		return "";
	}
	const { sizeMm, lines, lineHeightMm } = layout;
	const baseY = firstBaselineY(el.valign, el.y, el.h, layout);
	const anchorX = anchorXOf(el);
	const anchor = textAnchorOf(el.align);

	const font = opts.outlines?.(el.font, el.weight);
	if (font) {
		const d = lines
			.map((line, i) =>
				textPathData(
					font,
					line,
					anchorX,
					baseY + lineHeightMm * i,
					sizeMm,
					el.tracking,
					anchor,
				),
			)
			.join("");
		return d ? `<path d="${d}" fill="${el.color}"/>` : "";
	}

	return lines
		.map((line, i) => {
			const y = baseY + lineHeightMm * i;
			return (
				`<text x="${anchorX}" y="${y}" font-family="${escapeXml(el.font)}"` +
				` font-weight="${el.weight}" font-size="${sizeMm}"` +
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

// Квадрат по центру рамки, как «вписать целиком» у картинки
function renderQr(el: ImageElement, text: string): string {
	const side = Math.min(el.w, el.h);
	let d: string;
	try {
		d = qrPathData(
			text,
			el.x + (el.w - side) / 2,
			el.y + (el.h - side) / 2,
			side,
			el.qr,
		);
	} catch {
		// текст длиннее, чем влезает в QR, — рисовать нечего; причину скажут проблемы записи
		return "";
	}
	return `<path d="${d}" fill="${el.qr.color}"/>`;
}

// Фон — на всю рамку, даже без картинки: цвет задали намеренно, и пустой слот с
// фоном на печати — это плашка, а не дыра
function renderImageBackground(el: ImageElement): string {
	if (!el.background) return "";
	return `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" fill="${el.background}"/>`;
}

// Заглушка: пунктирная рамка с крестом, как «нет картинки» в любом редакторе.
// Пустой слот — серая, не загрузилась — оранжевая, как предупреждения в интерфейсе.
// Заливку не кладём поверх заданного фона: его цвет тоже надо видеть
const PLACEHOLDER = {
	empty: { stroke: "#B5B5AE", fill: "#F2F2EF" },
	broken: { stroke: "#D97706", fill: "#FFF4E5" },
};

function renderPlaceholder(
	el: ImageElement,
	kind: keyof typeof PLACEHOLDER,
): string {
	const { stroke, fill } = PLACEHOLDER[kind];
	// линия — от размера рамки, но не толще миллиметра: на визитке и на плакате одинаково
	const width = Math.min(0.3, Math.max(0.1, Math.min(el.w, el.h) / 100));
	const { x, y, w, h } = el;
	const paint = `stroke="${stroke}" stroke-width="${width}"`;
	return (
		`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${el.background ? "none" : fill}" ${paint} stroke-dasharray="${width * 4} ${width * 3}"/>` +
		`<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y + h}" ${paint}/>` +
		`<line x1="${x + w}" y1="${y}" x2="${x}" y2="${y + h}" ${paint}/>`
	);
}

function renderImageContent(
	el: ImageElement,
	scope: Scope,
	preview: ImagePreview | null,
): string {
	const { source } = imageSource(el.src, scope);
	if (source.kind === "qr") {
		return renderQr(el, source.text);
	}
	if (source.kind !== "href") {
		return preview ? renderPlaceholder(el, "empty") : "";
	}
	if (preview?.brokenImages.has(source.href)) {
		return renderPlaceholder(el, "broken");
	}
	const preserveAspectRatio = IMAGE_FIT_TO_PRESERVE_ASPECT_RATIO[el.fit];
	return (
		`<image x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}"` +
		` href="${escapeXml(source.href)}" preserveAspectRatio="${preserveAspectRatio}"/>`
	);
}

function renderImage(
	el: ImageElement,
	scope: Scope,
	preview: ImagePreview | null,
): string {
	return renderImageBackground(el) + renderImageContent(el, scope, preview);
}

function renderElement(
	el: CutlineElement,
	scope: Scope,
	opts: RenderOptions,
): string {
	if (!el.visible) {
		return "";
	}
	const inner = (() => {
		switch (el.type) {
			case "text":
				return renderText(el, scope, opts);
			case "rect":
				return renderRect(el);
			case "ellipse":
				return renderEllipse(el);
			case "line":
				return renderLine(el);
			case "image":
				return renderImage(el, scope, opts.preview);
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
	const scope: Scope = { record, n: opts.n };
	const elements = doc.elements
		.map((el) => renderElement(el, scope, opts))
		.join("");

	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm"` +
		` viewBox="${originX} ${originY} ${width} ${height}">` +
		`${background}${elements}</svg>`
	);
}
