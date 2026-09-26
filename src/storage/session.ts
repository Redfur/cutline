// Сохранённая сессия редактора в IndexedDB — документ и вид, чтобы перезагрузка
// страницы ничего не теряла. IndexedDB, а не localStorage: картинки в документе
// лежат data URI, и лимит localStorage (~5 МБ на сайт) кончился бы на первой
// фотографии. Сам доступ — idb-keyval: одна запись по ключу, своя обёртка не нужна.
import { createStore, get, promisifyRequest, type UseStore } from "idb-keyval";
import type { CutlineDocument } from "../model/document";
import { validateDocument } from "../model/file";

export interface ViewState {
	mode: "design" | "data";
	recordIndex: number;
}

export interface StoredSession {
	doc: CutlineDocument;
	view: ViewState;
	savedAt: number;
}

export type LoadResult =
	| { status: "empty" }
	| { status: "ok"; session: StoredSession }
	// запись есть, но это не документ (старая схема, ручная правка в DevTools) —
	// редактор открывается на пустом листе и говорит почему, а не падает
	| { status: "invalid"; reason: string };

// один ключ на всё — стартовому экрану со списком недавних (Этап 5) хватит
// перейти на ключ-id документа
const KEY = "current";

// createStore сразу открывает базу, поэтому лениво: там, где IndexedDB нет
// (старый приватный режим), падать должен вызов, а не импорт модуля
let store: UseStore | null = null;
function getStore(): UseStore {
	store ??= createStore("cutline", "documents");
	return store;
}

function validateView(value: unknown): ViewState {
	const v = (typeof value === "object" && value) || {};
	const mode = "mode" in v && v.mode === "data" ? "data" : "design";
	const recordIndex =
		"recordIndex" in v &&
		typeof v.recordIndex === "number" &&
		Number.isInteger(v.recordIndex) &&
		v.recordIndex >= 0
			? v.recordIndex
			: 0;
	return { mode, recordIndex };
}

// Ошибки самого IndexedDB (недоступен, заблокирован) пробрасываются: это другой
// случай, чем битая запись, — сохранять тогда тоже некуда.
export async function loadSession(): Promise<LoadResult> {
	const raw: unknown = await get(KEY, getStore());
	if (raw === undefined) return { status: "empty" };
	if (typeof raw !== "object" || raw === null || !("doc" in raw)) {
		return { status: "invalid", reason: "Сохранённая запись повреждена" };
	}
	try {
		const doc = validateDocument(raw.doc);
		const view = validateView("view" in raw ? raw.view : undefined);
		const savedAt =
			"savedAt" in raw && typeof raw.savedAt === "number" ? raw.savedAt : 0;
		return { status: "ok", session: { doc, view, savedAt } };
	} catch (error) {
		return {
			status: "invalid",
			reason: error instanceof Error ? error.message : String(error),
		};
	}
}

// Не idb-keyval set(), а тот же store с явным commit(): без него транзакция
// коммитится, только когда страница вернётся в цикл событий, а при уходе со страницы
// её держит модальный вопрос beforeunload, после которого документ выгружается и
// транзакция прерывается. Проверено: правка за 100 мс до F5 терялась даже с вопросом.
export function saveSession(session: StoredSession): Promise<void> {
	return getStore()("readwrite", (store) => {
		store.put(session, KEY);
		store.transaction.commit();
		return promisifyRequest(store.transaction);
	});
}

// Человеческое объяснение для индикатора сохранения
export function describeSaveError(error: unknown): string {
	if (error instanceof DOMException && error.name === "QuotaExceededError") {
		return "Документ слишком большой для хранилища браузера — сохраните его в файл";
	}
	return "Хранилище браузера недоступно — изменения не переживут перезагрузку, сохраните документ в файл";
}
