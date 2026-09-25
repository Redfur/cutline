// Фабрики фигур для добавления через тулбар. Точка клика — центр нового элемента.
import type {
	EllipseElement,
	LineElement,
	RectElement,
} from "../model/document";

interface PointMm {
	x: number;
	y: number;
}

const RECT_W_MM = 30;
const RECT_H_MM = 20;
const LINE_LENGTH_MM = 30;

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
