// SVG из render() → команды рисования для PDF. PDF строится из той же строки, что
// экспорт SVG и PNG, а не вторым обходом документа: render() остаётся единственной
// точкой, где документ становится картинкой, и расхождение «экран / печать» исключено
// по построению.
//
// Разбирается не произвольный SVG, а закрытое подмножество, которое пишет render():
// svg, rect, ellipse, line, path (текст в кривых), image и g с rotate(). Значения
// атрибутов там всегда в двойных кавычках и экранированы escapeXml — поэтому хватает
// регулярного разбора, и функция остаётся чистой (тестируется в node без DOMParser).
// Незнакомый тег — ошибка, а не молчаливый пропуск: иначе новый тип элемента в
// render() тихо пропадал бы из печати.

export type Rgb = [number, number, number];

export type Segment =
	| { op: "M"; x: number; y: number }
	| { op: "L"; x: number; y: number }
	| {
			op: "C";
			x1: number;
			y1: number;
			x2: number;
			y2: number;
			x: number;
			y: number;
	  }
	| { op: "Z" };

export type ImageFit = "cover" | "contain" | "fill";

// [a b c d e f] — как у SVG matrix() и PDF cm
export type Matrix = [number, number, number, number, number, number];

export type PdfOp =
	| {
			kind: "path";
			segments: Segment[];
			fill: Rgb | null;
			stroke: Rgb | null;
			strokeWidth: number;
	  }
	| {
			kind: "image";
			href: string;
			x: number;
			y: number;
			w: number;
			h: number;
			fit: ImageFit;
	  }
	| { kind: "push"; matrix: Matrix }
	| { kind: "pop" };

export interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface SvgPage {
	// в мм, система координат SVG (y вниз); у карточки с вылетом x, y = −вылет
	viewBox: Box;
	ops: PdfOp[];
}

// Доля радиуса для контрольных точек кубической кривой, приближающей четверть окружности
const KAPPA = 0.5522847498;

type Attrs = Record<string, string>;

function unescapeXml(value: string): string {
	return value
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&");
}

function parseAttrs(source: string): Attrs {
	const attrs: Attrs = {};
	for (const [, name, value] of source.matchAll(
		/([a-zA-Z][a-zA-Z0-9:-]*)="([^"]*)"/g,
	)) {
		attrs[name] = unescapeXml(value);
	}
	return attrs;
}

function num(attrs: Attrs, name: string, fallback = 0): number {
	const raw = attrs[name];
	if (raw === undefined) return fallback;
	const value = Number.parseFloat(raw);
	if (!Number.isFinite(value)) {
		throw new Error(`PDF: атрибут ${name}="${raw}" — не число`);
	}
	return value;
}

export function parseColor(value: string | undefined): Rgb | null {
	if (value === undefined || value === "none" || value === "transparent") {
		return null;
	}
	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
	if (!hex) {
		throw new Error(
			`Цвет «${value}» не поддерживается в PDF — нужен вид #RRGGBB`,
		);
	}
	const digits =
		hex[1].length === 3
			? [...hex[1]].map((d) => d + d).join("")
			: hex[1].toLowerCase();
	return [0, 2, 4].map(
		(i) => Number.parseInt(digits.slice(i, i + 2), 16) / 255,
	) as Rgb;
}

function paint(attrs: Attrs) {
	const stroke = parseColor(attrs.stroke);
	return {
		// у SVG заливка по умолчанию чёрная; render() пишет fill явно, но разбор
		// не должен от этого зависеть
		fill: parseColor(attrs.fill ?? "#000000"),
		stroke,
		strokeWidth: stroke ? num(attrs, "stroke-width", 1) : 0,
	};
}

function ellipseSegments(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
): Segment[] {
	const kx = rx * KAPPA;
	const ky = ry * KAPPA;
	return [
		{ op: "M", x: cx + rx, y: cy },
		{
			op: "C",
			x1: cx + rx,
			y1: cy + ky,
			x2: cx + kx,
			y2: cy + ry,
			x: cx,
			y: cy + ry,
		},
		{
			op: "C",
			x1: cx - kx,
			y1: cy + ry,
			x2: cx - rx,
			y2: cy + ky,
			x: cx - rx,
			y: cy,
		},
		{
			op: "C",
			x1: cx - rx,
			y1: cy - ky,
			x2: cx - kx,
			y2: cy - ry,
			x: cx,
			y: cy - ry,
		},
		{
			op: "C",
			x1: cx + kx,
			y1: cy - ry,
			x2: cx + rx,
			y2: cy - ky,
			x: cx + rx,
			y: cy,
		},
		{ op: "Z" },
	];
}

function rectSegments(
	x: number,
	y: number,
	w: number,
	h: number,
	radius: number,
): Segment[] {
	// как в SVG: радиус не больше половины стороны
	const r = Math.max(0, Math.min(radius, w / 2, h / 2));
	if (!r) {
		return [
			{ op: "M", x, y },
			{ op: "L", x: x + w, y },
			{ op: "L", x: x + w, y: y + h },
			{ op: "L", x, y: y + h },
			{ op: "Z" },
		];
	}
	const k = r * KAPPA;
	const right = x + w;
	const bottom = y + h;
	return [
		{ op: "M", x: x + r, y },
		{ op: "L", x: right - r, y },
		{
			op: "C",
			x1: right - r + k,
			y1: y,
			x2: right,
			y2: y + r - k,
			x: right,
			y: y + r,
		},
		{ op: "L", x: right, y: bottom - r },
		{
			op: "C",
			x1: right,
			y1: bottom - r + k,
			x2: right - r + k,
			y2: bottom,
			x: right - r,
			y: bottom,
		},
		{ op: "L", x: x + r, y: bottom },
		{
			op: "C",
			x1: x + r - k,
			y1: bottom,
			x2: x,
			y2: bottom - r + k,
			x,
			y: bottom - r,
		},
		{ op: "L", x, y: y + r },
		{ op: "C", x1: x, y1: y + r - k, x2: x + r - k, y2: y, x: x + r, y },
		{ op: "Z" },
	];
}

// Абсолютные M/L/C/Q/Z — всё, что пишет opentype.js в toPathData. Q переводится
// в C: в PDF квадратичных кривых нет. Числа бывают слитными: «1.5-2.25».
export function parsePathData(d: string): Segment[] {
	const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
	const segments: Segment[] = [];
	let i = 0;
	let command = "";
	let cx = 0;
	let cy = 0;
	let startX = 0;
	let startY = 0;
	const next = (): number => {
		const token = tokens[i++];
		const value = Number(token);
		if (token === undefined || Number.isNaN(value)) {
			throw new Error(`PDF: не разобрать путь «${d.slice(0, 40)}…»`);
		}
		return value;
	};
	while (i < tokens.length) {
		if (/[a-zA-Z]/.test(tokens[i])) {
			command = tokens[i++];
		}
		switch (command) {
			case "M":
				cx = next();
				cy = next();
				startX = cx;
				startY = cy;
				segments.push({ op: "M", x: cx, y: cy });
				// следующие пары после M — неявные L
				command = "L";
				break;
			case "L":
				cx = next();
				cy = next();
				segments.push({ op: "L", x: cx, y: cy });
				break;
			case "C": {
				const x1 = next();
				const y1 = next();
				const x2 = next();
				const y2 = next();
				cx = next();
				cy = next();
				segments.push({ op: "C", x1, y1, x2, y2, x: cx, y: cy });
				break;
			}
			case "Q": {
				const qx = next();
				const qy = next();
				const x = next();
				const y = next();
				segments.push({
					op: "C",
					x1: cx + (2 / 3) * (qx - cx),
					y1: cy + (2 / 3) * (qy - cy),
					x2: x + (2 / 3) * (qx - x),
					y2: y + (2 / 3) * (qy - y),
					x,
					y,
				});
				cx = x;
				cy = y;
				break;
			}
			case "Z":
			case "z":
				segments.push({ op: "Z" });
				cx = startX;
				cy = startY;
				command = "";
				break;
			default:
				throw new Error(`PDF: команда пути «${command}» не поддерживается`);
		}
	}
	return segments;
}

// rotate(a cx cy) = translate(cx cy) · rotate(a) · translate(−cx −cy)
function parseTransform(value: string): Matrix {
	const rotate =
		/^rotate\(\s*([^\s,)]+)[\s,]+([^\s,)]+)[\s,]+([^\s,)]+)\s*\)$/.exec(
			value.trim(),
		);
	if (!rotate) {
		throw new Error(`PDF: преобразование «${value}» не поддерживается`);
	}
	const [angle, cx, cy] = rotate.slice(1).map(Number);
	const rad = (angle * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	return [
		cos,
		sin,
		-sin,
		cos,
		cx - cos * cx + sin * cy,
		cy - sin * cx - cos * cy,
	];
}

const PRESERVE_ASPECT_RATIO_TO_FIT: Record<string, ImageFit> = {
	"xMidYMid slice": "cover",
	"xMidYMid meet": "contain",
	none: "fill",
};

export function svgToPdfOps(svg: string): SvgPage {
	let viewBox: Box | null = null;
	const ops: PdfOp[] = [];
	const tags = svg.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g);
	for (const [, closing, name, rawAttrs, selfClosing] of tags) {
		if (closing) {
			if (name === "g") ops.push({ kind: "pop" });
			continue;
		}
		const attrs = parseAttrs(rawAttrs);
		switch (name) {
			case "svg": {
				const [x, y, w, h] = (attrs.viewBox ?? "").split(/[\s,]+/).map(Number);
				if (![x, y, w, h].every(Number.isFinite)) {
					throw new Error("PDF: у SVG нет viewBox");
				}
				viewBox = { x, y, w, h };
				break;
			}
			case "g":
				ops.push({
					kind: "push",
					matrix: attrs.transform
						? parseTransform(attrs.transform)
						: [1, 0, 0, 1, 0, 0],
				});
				// <g/> без содержимого сразу закрыт — пара push/pop не должна разъехаться
				if (selfClosing) ops.push({ kind: "pop" });
				break;
			case "rect":
				ops.push({
					kind: "path",
					segments: rectSegments(
						num(attrs, "x"),
						num(attrs, "y"),
						num(attrs, "width"),
						num(attrs, "height"),
						num(attrs, "rx"),
					),
					...paint(attrs),
				});
				break;
			case "ellipse":
				ops.push({
					kind: "path",
					segments: ellipseSegments(
						num(attrs, "cx"),
						num(attrs, "cy"),
						num(attrs, "rx"),
						num(attrs, "ry"),
					),
					...paint(attrs),
				});
				break;
			case "line":
				ops.push({
					kind: "path",
					segments: [
						{ op: "M", x: num(attrs, "x1"), y: num(attrs, "y1") },
						{ op: "L", x: num(attrs, "x2"), y: num(attrs, "y2") },
					],
					// у линии нет заливки, даже если fill не указан
					...paint({ ...attrs, fill: "none" }),
				});
				break;
			case "path":
				ops.push({
					kind: "path",
					segments: parsePathData(attrs.d ?? ""),
					...paint(attrs),
				});
				break;
			case "image": {
				const fit =
					PRESERVE_ASPECT_RATIO_TO_FIT[
						attrs.preserveAspectRatio ?? "xMidYMid meet"
					];
				if (!fit) {
					throw new Error(
						`PDF: preserveAspectRatio="${attrs.preserveAspectRatio}" не поддерживается`,
					);
				}
				ops.push({
					kind: "image",
					href: attrs.href ?? "",
					x: num(attrs, "x"),
					y: num(attrs, "y"),
					w: num(attrs, "width"),
					h: num(attrs, "height"),
					fit,
				});
				break;
			}
			case "text":
				// pdf-lib не видит шрифтов: текст обязан прийти кривыми (outlines в render)
				throw new Error(
					"PDF: текст не переведён в кривые — шрифт не встроенный или не загрузился",
				);
			default:
				throw new Error(`PDF: тег <${name}> не поддерживается`);
		}
	}
	if (!viewBox) {
		throw new Error("PDF: на входе не SVG");
	}
	return { viewBox, ops };
}

// Где рисовать картинку внутри рамки — как preserveAspectRatio у <image> в SVG
export function placeImage(
	box: Box,
	naturalW: number,
	naturalH: number,
	fit: ImageFit,
): Box {
	if (fit === "fill" || !naturalW || !naturalH) return box;
	const scale =
		fit === "cover"
			? Math.max(box.w / naturalW, box.h / naturalH)
			: Math.min(box.w / naturalW, box.h / naturalH);
	const w = naturalW * scale;
	const h = naturalH * scale;
	return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}
