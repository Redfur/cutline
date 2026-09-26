// Фабрики фигур для добавления через тулбар. Точка клика — центр нового элемента.
import type {
	EllipseElement,
	ImageElement,
	LineElement,
	RectElement,
	TextElement,
} from "../model/document";

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
		// JetBrains Mono уже загружен глобально для интерфейса редактора
		// (src/ui/tokens/fonts.css) — реально отрендерится без доп. настройки.
		// Настоящая загрузка шрифтов документа — отдельная будущая задача.
		font: "JetBrains Mono",
		weight: "regular",
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
