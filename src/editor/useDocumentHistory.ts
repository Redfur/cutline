// История изменений документа. CLAUDE.md требует её с первого дня — любая мутация
// документа (даже свойство холста в инспекторе) должна проходить через один слой
// истории, иначе прикручивать undo/redo позже значит переписывать половину проекта.
import { useCallback, useRef, useState } from "react";
import type { CutlineDocument } from "../model/document";

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
			setState(({ past, present, future }) => {
				if (coalesce) {
					return { past, present: updater(present), future };
				}
				return {
					past: [...past, present],
					present: updater(present),
					future: [],
				};
			});
		},
		[],
	);

	const undo = useCallback(() => {
		lastSetAtRef.current = null; // следующая правка не должна смёржиться с отменённым состоянием
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
		lastSetAtRef.current = null;
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
