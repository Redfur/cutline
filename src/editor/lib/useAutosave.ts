// Автосохранение сессии в IndexedDB: подписка React на createAutosaver. Логика
// «когда писать» — в storage/autosave.ts (с тестами), здесь только проводка:
// смена документа/вида → schedule, вкладку прячут или закрывают → flush.
import { useEffect, useRef, useState } from "react";
import type { CutlineDocument } from "../../model/document";
import {
	type Autosaver,
	createAutosaver,
	type SaveStatus,
} from "../../storage/autosave";
import {
	describeSaveError,
	type StoredSession,
	saveSession,
	type ViewState,
} from "../../storage/session";

// Короче — IndexedDB дёргается на каждый символ в ячейке; длиннее — дольше окно,
// в которое уход со страницы спрашивает «изменения могут не сохраниться»
const SAVE_DELAY_MS = 500;

export interface AutosaveState {
	status: SaveStatus;
	// подпись вместо стандартной «Не сохранено», когда причина другая
	label: string | null;
	// подробности для title индикатора
	message: string | null;
}

export interface AutosaveOptions {
	// IndexedDB открылся при загрузке; нет — работаем как раньше, без сохранения
	enabled: boolean;
	// сохранённый документ не открылся — показываем, пока не сохранится новый
	notice: string | null;
}

function initialState({ enabled, notice }: AutosaveOptions): AutosaveState {
	if (!enabled) {
		return {
			status: "error",
			label: null,
			message: describeSaveError(new Error("unavailable")),
		};
	}
	if (notice) {
		return {
			status: "error",
			label: "Сохранённый документ не открылся",
			message: notice,
		};
	}
	return { status: "saved", label: null, message: null };
}

export function useAutosave(
	doc: CutlineDocument,
	view: ViewState,
	options: AutosaveOptions,
): AutosaveState {
	const [state, setState] = useState(() => initialState(options));
	const saverRef = useRef<Autosaver<StoredSession> | null>(null);
	const { enabled } = options;

	useEffect(() => {
		if (!enabled) return;
		const saver = createAutosaver<StoredSession>({
			save: saveSession,
			delayMs: SAVE_DELAY_MS,
			onStatus: (status, error) =>
				setState({
					status,
					label: null,
					message: status === "error" ? describeSaveError(error) : null,
				}),
		});
		saverRef.current = saver;
		const onVisibility = () => {
			if (document.visibilityState === "hidden") void saver.flush();
		};
		// Транзакция IndexedDB, начатая при выгрузке страницы, прерывается вместе с ней
		// (проверено: правка за 100 мс до F5 терялась молча). Поэтому если правки ещё не
		// легли, запускаем запись и просим браузер спросить «уйти со страницы?» — пока
		// человек читает вопрос, запись успевает. Вне окна дебаунса вопроса нет.
		const onBeforeUnload = (e: BeforeUnloadEvent) => {
			if (!saver.hasPending()) return;
			void saver.flush();
			e.preventDefault();
		};
		document.addEventListener("visibilitychange", onVisibility);
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => {
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("beforeunload", onBeforeUnload);
			void saver.flush();
			saver.dispose();
			saverRef.current = null;
		};
	}, [enabled]);

	// Начальное состояние только что прочитано из хранилища — писать его обратно
	// незачем. Но после первой правки сравнение с начальным отключается: откат
	// Ctrl+Z до исходного — тоже изменение относительно того, что уже записано.
	const initialRef = useRef({ doc, ...view });
	const touchedRef = useRef(false);
	const { mode, recordIndex } = view;
	useEffect(() => {
		const initial = initialRef.current;
		if (
			!touchedRef.current &&
			doc === initial.doc &&
			mode === initial.mode &&
			recordIndex === initial.recordIndex
		) {
			return;
		}
		touchedRef.current = true;
		saverRef.current?.schedule({
			doc,
			view: { mode, recordIndex },
			savedAt: Date.now(),
		});
	}, [doc, mode, recordIndex]);

	return state;
}
