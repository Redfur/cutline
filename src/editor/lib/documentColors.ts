// Цвета, которые уже есть в документе, — ряд быстрого выбора у поля цвета. Макет обычно
// держится на паре фирменных цветов, и повторить один из них точнее и быстрее, чем
// попасть в него пипеткой или вспоминать hex. Частые — первыми.
import type { CutlineDocument } from "../../model/document";

const HEX = /^#[0-9A-F]{6}$/;

export function documentColors(
	doc: Pick<CutlineDocument, "canvas" | "elements">,
	limit = 8,
): string[] {
	const counts = new Map<string, number>();
	const add = (color: string | null | undefined) => {
		const hex = color?.toUpperCase();
		// transparent и прочее не-hex ColorField всё равно не покажет
		if (!hex || !HEX.test(hex)) return;
		counts.set(hex, (counts.get(hex) ?? 0) + 1);
	};

	add(doc.canvas.background);
	for (const el of doc.elements) {
		if (el.type === "text") add(el.color);
		if (el.type === "rect" || el.type === "ellipse") add(el.fill);
		if (el.type === "rect" || el.type === "ellipse" || el.type === "line")
			add(el.stroke);
	}

	// sort стабильный: при равной частоте порядок первого появления
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([hex]) => hex);
}
