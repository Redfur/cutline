// История изменений документа. CLAUDE.md требует её с первого дня — любая мутация
// документа (даже свойство холста в инспекторе) должна проходить через один слой
// истории, иначе прикручивать undo/redo позже значит переписывать половину проекта.
//
// Сам undo/redo как фича (горячие клавиши, группировка мелких шагов вроде перетаскивания
// в один шаг истории) — отдельный будущий пункт роадмапа. Здесь только механизм.
import { useCallback, useState } from "react";
import type { CutlineDocument } from "../model/document";

export interface DocumentHistory {
	doc: CutlineDocument;
	set: (updater: (doc: CutlineDocument) => CutlineDocument) => void;
	undo: () => void;
	redo: () => void;
	canUndo: boolean;
	canRedo: boolean;
}

interface HistoryState {
	past: CutlineDocument[];
	present: CutlineDocument;
	future: CutlineDocument[];
}

export function useDocumentHistory(initial: CutlineDocument): DocumentHistory {
	const [state, setState] = useState<HistoryState>({
		past: [],
		present: initial,
		future: [],
	});

	const set = useCallback(
		(updater: (doc: CutlineDocument) => CutlineDocument) => {
			setState(({ past, present }) => ({
				past: [...past, present],
				present: updater(present),
				future: [],
			}));
		},
		[],
	);

	const undo = useCallback(() => {
		setState(({ past, present, future }) => {
			const previous = past.at(-1);
			if (!previous) {
				return { past, present, future };
			}
			return {
				past: past.slice(0, -1),
				present: previous,
				future: [present, ...future],
			};
		});
	}, []);

	const redo = useCallback(() => {
		setState(({ past, present, future }) => {
			const next = future[0];
			if (!next) {
				return { past, present, future };
			}
			return {
				past: [...past, present],
				present: next,
				future: future.slice(1),
			};
		});
	}, []);

	return {
		doc: state.present,
		set,
		undo,
		redo,
		canUndo: state.past.length > 0,
		canRedo: state.future.length > 0,
	};
}
