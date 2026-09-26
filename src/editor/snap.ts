// Привязки при перемещении — чистая геометрия, без DOM и состояния, как resizeElement.ts.
// CLAUDE.md: «без них двигать элементы мышью мучительно, сделать хорошо — неожиданно
// сложно» — отдельная функция, чтобы её было видно и проверять отдельно от драга.
import type { Canvas, CutlineElement, Guide } from "../model/document";
import type { HandlePos } from "./resizeElement";

export interface SnapGuide {
	axis: "x" | "y";
	positionMm: number;
}

export interface SnapResult {
	x: number;
	y: number;
	guides: SnapGuide[];
}

export interface SnapResizeResult {
	x: number;
	y: number;
	w: number;
	h: number;
	guides: SnapGuide[];
}

interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

function axisTargets(
	axis: "x" | "y",
	others: CutlineElement[],
	canvas: Canvas,
	guides: Guide[],
): number[] {
	const size = axis === "x" ? canvas.w : canvas.h;
	// к полям (вылет, обрез, безопасное поле) и к центру холста
	const targets = [
		-canvas.bleed,
		0,
		size,
		size + canvas.bleed,
		size / 2,
		canvas.safe,
		size - canvas.safe,
	];
	for (const el of others) {
		const start = axis === "x" ? el.x : el.y;
		const length = axis === "x" ? el.w : el.h;
		targets.push(start, start + length / 2, start + length);
	}
	for (const guide of guides) {
		if (guide.axis === axis) targets.push(guide.positionMm);
	}
	return targets;
}

function bestSnap(
	points: number[],
	targets: number[],
	thresholdMm: number,
): { delta: number; target: number } | null {
	let best: { delta: number; target: number } | null = null;
	for (const point of points) {
		for (const target of targets) {
			const delta = target - point;
			if (
				Math.abs(delta) <= thresholdMm &&
				(!best || Math.abs(delta) < Math.abs(best.delta))
			) {
				best = { delta, target };
			}
		}
	}
	return best;
}

export function snapMove(
	box: Box,
	others: CutlineElement[],
	canvas: Canvas,
	userGuides: Guide[],
	thresholdMm: number,
): SnapResult {
	const guides: SnapGuide[] = [];
	let { x, y } = box;

	const xBest = bestSnap(
		[x, x + box.w / 2, x + box.w],
		axisTargets("x", others, canvas, userGuides),
		thresholdMm,
	);
	if (xBest) {
		x += xBest.delta;
		guides.push({ axis: "x", positionMm: xBest.target });
	}

	const yBest = bestSnap(
		[y, y + box.h / 2, y + box.h],
		axisTargets("y", others, canvas, userGuides),
		thresholdMm,
	);
	if (yBest) {
		y += yBest.delta;
		guides.push({ axis: "y", positionMm: yBest.target });
	}

	return { x, y, guides };
}

// В отличие от snapMove (три точки на ось — оба края и центр), при resize двигается
// только тот край, который тянет конкретный маркер; неподвижный край остаётся на месте,
// а w/h пересчитываются от разницы — иначе противоположный край дёргался бы при снапе.
export function snapResize(
	box: Box,
	handle: HandlePos,
	others: CutlineElement[],
	canvas: Canvas,
	userGuides: Guide[],
	thresholdMm: number,
): SnapResizeResult {
	const guides: SnapGuide[] = [];
	let { x, y, w, h } = box;

	if (handle.x !== 0.5) {
		const point = handle.x === 0 ? x : x + w;
		const best = bestSnap(
			[point],
			axisTargets("x", others, canvas, userGuides),
			thresholdMm,
		);
		if (best) {
			if (handle.x === 0) {
				const rightEdge = x + w;
				x = best.target;
				w = rightEdge - x;
			} else {
				w = best.target - x;
			}
			guides.push({ axis: "x", positionMm: best.target });
		}
	}

	if (handle.y !== 0.5) {
		const point = handle.y === 0 ? y : y + h;
		const best = bestSnap(
			[point],
			axisTargets("y", others, canvas, userGuides),
			thresholdMm,
		);
		if (best) {
			if (handle.y === 0) {
				const bottomEdge = y + h;
				y = best.target;
				h = bottomEdge - y;
			} else {
				h = best.target - y;
			}
			guides.push({ axis: "y", positionMm: best.target });
		}
	}

	return { x, y, w, h, guides };
}
