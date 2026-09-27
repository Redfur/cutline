// Фабрики элементов для инструментов тулбара. Клик — элемент размера по умолчанию
// с центром в точке клика (placeElement); протягивание — рамка от точки нажатия до
// курсора (drawElement).
import type {
	CutlineElement,
	ElementType,
	EllipseElement,
	ImageElement,
	LineElement,
	RectElement,
	TextElement,
} from "../../model/document";
import { DEFAULT_QR_STYLE } from "../../model/migrate";

interface PointMm {
	x: number;
	y: number;
}

const RECT_W_MM = 30;
const RECT_H_MM = 20;
const LINE_LENGTH_MM = 30;
const TEXT_W_MM = 40;
const TEXT_H_MM = 10;
const IMAGE_SIZE_MM = 40;
// у бейджа A6 код 25 мм читается с расстояния вытянутой руки и не съедает макет
const QR_SIZE_MM = 25;
// n() есть в любой записи — вставленный код рисуется сразу, даже без полей в «Данных»
const QR_SAMPLE_SRC = '{{ qr("https://example.com/", n()) }}';

function id(): string {
	return crypto.randomUUID();
}

export function createRect(at: PointMm): RectElement {
	return {
		id: id(),
		name: "Прямоугольник",
		type: "rect",
		x: at.x - RECT_W_MM / 2,
		y: at.y - RECT_H_MM / 2,
		w: RECT_W_MM,
		h: RECT_H_MM,
		rotation: 0,
		locked: false,
		visible: true,
		fill: "#CCCCCC",
		stroke: null,
		strokeWidth: 0,
		radius: 0,
	};
}

export function createEllipse(at: PointMm): EllipseElement {
	return {
		id: id(),
		name: "Эллипс",
		type: "ellipse",
		x: at.x - RECT_W_MM / 2,
		y: at.y - RECT_H_MM / 2,
		w: RECT_W_MM,
		h: RECT_H_MM,
		rotation: 0,
		locked: false,
		visible: true,
		fill: "#CCCCCC",
		stroke: null,
		strokeWidth: 0,
	};
}

export function createText(at: PointMm): TextElement {
	return {
		id: id(),
		name: "Текст",
		type: "text",
		x: at.x - TEXT_W_MM / 2,
		y: at.y - TEXT_H_MM / 2,
		w: TEXT_W_MM,
		h: TEXT_H_MM,
		rotation: 0,
		locked: false,
		visible: true,
		content: "Текст",
		// встроенный (src/fonts/bundled.ts): новый текст сразу попадает в PDF
		font: "JetBrains Mono",
		weight: 400,
		size: 6,
		minSize: 3,
		lineHeight: 1.2,
		tracking: 0,
		align: "left",
		valign: "top",
		color: "#111111",
		fit: "shrink",
		transform: "none",
	};
}

export function createImage(at: PointMm): ImageElement {
	return {
		id: id(),
		name: "Изображение",
		type: "image",
		x: at.x - IMAGE_SIZE_MM / 2,
		y: at.y - IMAGE_SIZE_MM / 2,
		w: IMAGE_SIZE_MM,
		h: IMAGE_SIZE_MM,
		rotation: 0,
		locked: false,
		visible: true,
		// хранить файлы негде (нет бэкенда) — src заполняется в инспекторе: ссылкой
		// (основной способ) или через загрузку файла (data URI, второстепенный)
		src: "",
		fit: "cover",
		background: null,
		qr: DEFAULT_QR_STYLE,
	};
}

export function createQr(at: PointMm): ImageElement {
	return {
		...createImage(at),
		name: "QR-код",
		x: at.x - QR_SIZE_MM / 2,
		y: at.y - QR_SIZE_MM / 2,
		w: QR_SIZE_MM,
		h: QR_SIZE_MM,
		src: QR_SAMPLE_SRC,
	};
}

export function createLine(at: PointMm): LineElement {
	return {
		id: id(),
		name: "Линия",
		type: "line",
		x: at.x - LINE_LENGTH_MM / 2,
		y: at.y,
		w: LINE_LENGTH_MM,
		h: 0,
		rotation: 0,
		locked: false,
		visible: true,
		stroke: "#111111",
		strokeWidth: 0.5,
	};
}

// Что умеет ставить инструмент: типы элементов и QR — картинка с qr() в src,
// у которой свой инструмент, чтобы о QR можно было узнать, не читая справку
export type PlaceType = ElementType | "qr";

const FACTORIES: Record<PlaceType, (at: PointMm) => CutlineElement> = {
	rect: createRect,
	ellipse: createEllipse,
	line: createLine,
	text: createText,
	image: createImage,
	qr: createQr,
};

export function placeElement(type: PlaceType, at: PointMm): CutlineElement {
	return FACTORIES[type](at);
}

// QR render() всё равно вписывает квадратом — неквадратная рамка вокруг него
// выглядела бы как ошибка, поэтому тянется всегда как с Shift
export function alwaysSquare(type: PlaceType): boolean {
	return type === "qr";
}

// Протягивание, которое по одной оси почти не сдвинулось, не должно давать
// прямоугольник нулевой высоты — его потом не ухватить мышью
const MIN_DRAWN_MM = 1;
const EIGHTH_TURN = Math.PI / 4;

export interface DrawOptions {
	// Shift: квадрат/круг у фигур, угол кратный 45° у линии
	constrain?: boolean;
}

function constrainLine(dx: number, dy: number): { dx: number; dy: number } {
	const length = Math.hypot(dx, dy);
	const angle = Math.round(Math.atan2(dy, dx) / EIGHTH_TURN) * EIGHTH_TURN;
	// cos(90°) во float не ноль, а 6e-17 — вертикальная линия получила бы хвост в x
	const clean = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v);
	return {
		dx: clean(length * Math.cos(angle)),
		dy: clean(length * Math.sin(angle)),
	};
}

export function drawElement(
	type: PlaceType,
	from: PointMm,
	to: PointMm,
	{ constrain: shift = false }: DrawOptions = {},
): CutlineElement {
	let dx = to.x - from.x;
	let dy = to.y - from.y;
	const constrain = shift || alwaysSquare(type);
	const base = placeElement(type, from);

	// линия — вектор от начала к концу, без нормализации: направление и есть смысл
	if (type === "line") {
		if (constrain) ({ dx, dy } = constrainLine(dx, dy));
		return { ...base, x: from.x, y: from.y, w: dx, h: dy };
	}

	if (constrain) {
		const side = Math.max(Math.abs(dx), Math.abs(dy));
		dx = (dx < 0 ? -1 : 1) * side;
		dy = (dy < 0 ? -1 : 1) * side;
	}
	const w = Math.max(Math.abs(dx), MIN_DRAWN_MM);
	const h = Math.max(Math.abs(dy), MIN_DRAWN_MM);
	// тянули влево/вверх — точка нажатия становится правым/нижним краем
	return {
		...base,
		x: dx < 0 ? from.x - w : from.x,
		y: dy < 0 ? from.y - h : from.y,
		w,
		h,
	};
}
