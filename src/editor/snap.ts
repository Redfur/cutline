// Привязки при перемещении — чистая геометрия, без DOM и состояния, как resizeElement.ts.
// CLAUDE.md: «без них двигать элементы мышью мучительно, сделать хорошо — неожиданно
// сложно» — отдельная функция, чтобы её было видно и проверять отдельно от драга.
import type { Canvas, CutlineElement } from "../model/document";

export interface SnapGuide {
	axis: "x" | "y";
	positionMm: number;
}

export interface SnapResult {
	x: number;
	y: number;
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
): number[] {
	const size = axis === "x" ? canvas.w : canvas.h;
	// к полям (обрез + безопасное поле) и к центру холста
	const targets = [0, size, size / 2, canvas.safe, size - canvas.safe];
	for (const el of others) {
		const start = axis === "x" ? el.x : el.y;
		const length = axis === "x" ? el.w : el.h;
		targets.push(start, start + length / 2, start + length);
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
	thresholdMm: number,
): SnapResult {
	const guides: SnapGuide[] = [];
	let { x, y } = box;

	const xBest = bestSnap(
		[x, x + box.w / 2, x + box.w],
		axisTargets("x", others, canvas),
		thresholdMm,
	);
	if (xBest) {
		x += xBest.delta;
		guides.push({ axis: "x", positionMm: xBest.target });
	}

	const yBest = bestSnap(
		[y, y + box.h / 2, y + box.h],
		axisTargets("y", others, canvas),
		thresholdMm,
	);
	if (yBest) {
		y += yBest.delta;
		guides.push({ axis: "y", positionMm: yBest.target });
	}

	return { x, y, guides };
}
