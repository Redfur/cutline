// Пустой документ A6 — стартовое состояние редактора: холст есть, элементов нет.
import type { CutlineDocument } from "../../model/document";

export const blankDocument: CutlineDocument = {
	version: 1,
	canvas: {
		w: 105,
		h: 148,
		bleed: 3,
		safe: 5,
		background: "#FFFFFF",
	},
	fonts: [],
	fields: [],
	records: [],
	elements: [],
	guides: [],
};
