// Чистые переходы истории — без React и без времени, чтобы их можно было проверить
// тестами. Решение «коалесцировать или нет» (окно по времени, boundary) принимает
// useDocumentHistory и передаёт сюда готовым флагом.
import type { CutlineDocument } from "../model/document";

export interface HistoryState {
	past: CutlineDocument[];
	present: CutlineDocument;
	future: CutlineDocument[];
}

export function commit(
	{ past, present, future }: HistoryState,
	updater: (doc: CutlineDocument) => CutlineDocument,
	coalesce: boolean,
): HistoryState {
	if (coalesce) {
		return { past, present: updater(present), future };
	}
	return {
		past: [...past, present],
		present: updater(present),
		future: [],
	};
}

export function undo(state: HistoryState): HistoryState {
	const { past, present, future } = state;
	const previous = past.at(-1);
	if (!previous) {
		return state;
	}
	return {
		past: past.slice(0, -1),
		present: previous,
		future: [present, ...future],
	};
}

export function redo(state: HistoryState): HistoryState {
	const { past, present, future } = state;
	const next = future[0];
	if (!next) {
		return state;
	}
	return {
		past: [...past, present],
		present: next,
		future: future.slice(1),
	};
}
