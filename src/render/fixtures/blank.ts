// Пустой документ A6 — стартовое состояние редактора: холст есть, элементов нет.
import type { CutlineDocument } from "../../model/document";
import { CURRENT_VERSION, UNTITLED } from "../../model/migrate";

export const blankDocument: CutlineDocument = {
	version: CURRENT_VERSION,
	name: UNTITLED,
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
