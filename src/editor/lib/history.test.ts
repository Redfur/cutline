import { describe, expect, it } from "vitest";
import type { CutlineDocument } from "../../model/document";
import { blankDocument } from "../../render/fixtures/blank";
import { commit, type HistoryState, redo, undo } from "./history";

// документы различаем по ширине холста — остальное содержимое тут не важно
function docW(w: number): CutlineDocument {
	return { ...blankDocument, canvas: { ...blankDocument.canvas, w } };
}
const setW = (w: number) => (doc: CutlineDocument) => ({
	...doc,
	canvas: { ...doc.canvas, w },
});
const widths = (s: HistoryState) => ({
	past: s.past.map((d) => d.canvas.w),
	present: s.present.canvas.w,
	future: s.future.map((d) => d.canvas.w),
});

const initial: HistoryState = { past: [], present: docW(1), future: [] };

describe("history", () => {
	it("commit кладёт предыдущее состояние в past", () => {
		expect(widths(commit(initial, setW(2), false))).toEqual({
			past: [1],
			present: 2,
			future: [],
		});
	});

	it("коалесцированный commit заменяет present на месте", () => {
		const s = commit(commit(initial, setW(2), false), setW(3), true);
		expect(widths(s)).toEqual({ past: [1], present: 3, future: [] });
	});

	it("новый commit после undo сбрасывает future", () => {
		const s = undo(commit(initial, setW(2), false));
		expect(widths(s).future).toEqual([2]);
		expect(widths(commit(s, setW(5), false))).toEqual({
			past: [1],
			present: 5,
			future: [],
		});
	});

	it("undo/redo на пустых стеках ничего не меняют", () => {
		expect(undo(initial)).toBe(initial);
		expect(redo(initial)).toBe(initial);
	});

	it("undo → redo возвращает исходное состояние", () => {
		const s = commit(commit(initial, setW(2), false), setW(3), false);
		expect(widths(undo(undo(s)))).toEqual({
			past: [],
			present: 1,
			future: [2, 3],
		});
		expect(widths(redo(redo(undo(undo(s)))))).toEqual(widths(s));
	});
});
