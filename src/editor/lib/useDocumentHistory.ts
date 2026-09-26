// История изменений документа. CLAUDE.md требует её с первого дня — любая мутация
// документа (даже свойство холста в инспекторе) должна проходить через один слой
// истории, иначе прикручивать undo/redo позже значит переписывать половину проекта.
import { useCallback, useRef, useState } from "react";
import type { CutlineDocument } from "../../model/document";
import { commit, type HistoryState, redo, undo } from "./history";

// Поля инспектора (TextField и т.д.) вызывают onChange на каждое нажатие клавиши —
// без коалессинга набор «Привет» в поле «Содержимое» дал бы 6 шагов истории.
// Перетаскивание/resize эту проблему уже решают на своём уровне (Canvas.tsx копит
// live-состояние и коммитит один раз на mouseup) — здесь тот же принцип, но проще:
// вызовы set() внутри COALESCE_MS друг от друга не пушат новую запись, а заменяют
// present на месте. Эвристика по времени, не по источнику: непрерывный набор идёт
// быстрее окна, переключение на другое поле/действие — почти всегда медленнее.
const COALESCE_MS = 600;

export interface SetOptions {
	// структурные действия (создать/удалить элемент, открыть файл) никогда не коалесцируются
	// и сами становятся границей: следующий set() тоже не смёржится в них. Без этого — реальный
	// баг, пойманный тестом: добавить текст и сразу начать печатать быстрее COALESCE_MS
	// сливает создание элемента с первым нажатием клавиши в один шаг; один Ctrl+Z сносит и то, и то.
	boundary?: boolean;
}

export interface DocumentHistory {
	doc: CutlineDocument;
	set: (
		updater: (doc: CutlineDocument) => CutlineDocument,
		options?: SetOptions,
	) => void;
	undo: () => void;
	redo: () => void;
	canUndo: boolean;
	canRedo: boolean;
}

export function useDocumentHistory(initial: CutlineDocument): DocumentHistory {
	const [state, setState] = useState<HistoryState>({
		past: [],
		present: initial,
		future: [],
	});

	const lastSetAtRef = useRef<number | null>(null);

	const set = useCallback(
		(
			updater: (doc: CutlineDocument) => CutlineDocument,
			options?: SetOptions,
		) => {
			const now = Date.now();
			const coalesce =
				!options?.boundary &&
				lastSetAtRef.current !== null &&
				now - lastSetAtRef.current < COALESCE_MS;
			lastSetAtRef.current = options?.boundary ? null : now;
			setState((state) => commit(state, updater, coalesce));
		},
		[],
	);

	const undoStep = useCallback(() => {
		lastSetAtRef.current = null; // следующая правка не должна смёржиться с отменённым состоянием
		setState(undo);
	}, []);

	const redoStep = useCallback(() => {
		lastSetAtRef.current = null;
		setState(redo);
	}, []);

	return {
		doc: state.present,
		set,
		undo: undoStep,
		redo: redoStep,
		canUndo: state.past.length > 0,
		canRedo: state.future.length > 0,
	};
}
