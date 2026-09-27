// Документы редактора в IndexedDB — макет, данные и вид каждого, чтобы перезагрузка
// ничего не теряла, а документов могло быть несколько (Этап 5). IndexedDB, а не
// localStorage: картинки в документе лежат data URI, и лимит localStorage (~5 МБ на
// сайт) кончился бы на первой фотографии. Доступ — idb-keyval, своя обёртка не нужна.
//
// Ключи в одном store (второй object store idb-keyval без апгрейда базы не открывает):
//   doc:<id> — StoredDocument целиком;
//   index    — [{ id, name, savedAt }]: список для переключателя без чтения тяжёлых
//              документов, обновляется в той же транзакции, что и документ;
//   last     — id последнего открытого;
//   current  — одиночная сессия до Этапа 5, переносится в doc:<id> при первом чтении.
import { createStore, get, promisifyRequest, type UseStore } from "idb-keyval";
import type { BorderVisibility } from "../editor/lib/snap";
import type { CutlineDocument } from "../model/document";
import { validateDocument } from "../model/file";
import { UNTITLED } from "../model/migrate";

export interface ViewState {
	mode: "design" | "data";
	recordIndex: number;
	// галочки «Направляющие» в инспекторе холста — вид, как зум, но переживает перезагрузку
	borders: BorderVisibility;
}

export interface StoredDocument {
	id: string;
	doc: CutlineDocument;
	view: ViewState;
	savedAt: number;
}

export interface DocumentSummary {
	id: string;
	name: string;
	savedAt: number;
}

export type LoadResult =
	| { status: "ok"; stored: StoredDocument }
	| { status: "missing" }
	// запись есть, но это не документ (старая схема, ручная правка в DevTools) —
	// в списке она «не открывается», редактор не падает
	| { status: "invalid"; reason: string };

const INDEX = "index";
const LAST = "last";
const LEGACY = "current";
const docKey = (id: string) => `doc:${id}`;

// createStore сразу открывает базу, поэтому лениво: там, где IndexedDB нет
// (старый приватный режим), падать должен вызов, а не импорт модуля
let store: UseStore | null = null;
function getStore(): UseStore {
	store ??= createStore("cutline", "documents");
	return store;
}

export function newDocumentId(): string {
	return crypto.randomUUID();
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
	const b = "borders" in v && typeof v.borders === "object" && v.borders;
	// не булево или нет поля (сессия до появления галочек) — граница видна
	const shown = (key: keyof BorderVisibility) =>
		!(b && key in b && (b as Record<string, unknown>)[key] === false);
	const borders = {
		trim: shown("trim"),
		bleed: shown("bleed"),
		safe: shown("safe"),
	};
	return { mode, recordIndex, borders };
}

function isSummary(value: unknown): value is DocumentSummary {
	return (
		typeof value === "object" &&
		value !== null &&
		"id" in value &&
		typeof value.id === "string" &&
		"name" in value &&
		typeof value.name === "string" &&
		"savedAt" in value &&
		typeof value.savedAt === "number"
	);
}

// Имя старой записи для списка — даже если сама запись битая
function nameOf(raw: unknown): string {
	if (typeof raw !== "object" || raw === null || !("doc" in raw))
		return UNTITLED;
	const doc = raw.doc;
	return typeof doc === "object" &&
		doc !== null &&
		"name" in doc &&
		typeof doc.name === "string" &&
		doc.name.trim()
		? doc.name
		: UNTITLED;
}

// Одиночная сессия до Этапа 5 становится первым документом списка. Переносится как
// есть, без проверки: битая запись попадёт в список «не открывается», а не пропадёт.
// Проверка «индекса ещё нет» и перенос — одной readwrite-транзакцией: такие транзакции
// IndexedDB выполняет по очереди, и второй вызов (StrictMode запускает эффект загрузки
// дважды, соседняя вкладка) уже видит индекс. Раздельно get и put переносили сессию
// дважды — реальный баг, пойман в браузере.
function migrateLegacy(): Promise<DocumentSummary[]> {
	let result: DocumentSummary[] = [];
	return getStore()("readwrite", (s) => {
		const indexRequest = s.get(INDEX);
		indexRequest.onsuccess = () => {
			const index: unknown = indexRequest.result;
			if (Array.isArray(index)) {
				result = index.filter(isSummary);
				return;
			}
			const legacyRequest = s.get(LEGACY);
			legacyRequest.onsuccess = () => {
				const legacy: unknown = legacyRequest.result;
				if (legacy === undefined) return;
				const id = newDocumentId();
				const savedAt =
					typeof legacy === "object" &&
					legacy !== null &&
					"savedAt" in legacy &&
					typeof legacy.savedAt === "number"
						? legacy.savedAt
						: Date.now();
				result = [{ id, name: nameOf(legacy), savedAt }];
				const record =
					typeof legacy === "object" && legacy !== null
						? { ...legacy, id }
						: { doc: legacy, id };
				s.put(record, docKey(id));
				s.put(result, INDEX);
				s.put(id, LAST);
				s.delete(LEGACY);
			};
		};
		return promisifyRequest(s.transaction);
	}).then(() => result);
}

// Список документов — свежие сверху. Ошибки самого IndexedDB (недоступен,
// заблокирован) пробрасываются: сохранять тогда тоже некуда.
export async function listDocuments(): Promise<DocumentSummary[]> {
	const raw: unknown = await get(INDEX, getStore());
	const list = Array.isArray(raw)
		? raw.filter(isSummary)
		: await migrateLegacy();
	return [...list].sort((a, b) => b.savedAt - a.savedAt);
}

export async function loadDocument(id: string): Promise<LoadResult> {
	const raw: unknown = await get(docKey(id), getStore());
	if (raw === undefined) return { status: "missing" };
	if (typeof raw !== "object" || raw === null || !("doc" in raw)) {
		return { status: "invalid", reason: "Сохранённая запись повреждена" };
	}
	try {
		const doc = validateDocument(raw.doc);
		const view = validateView("view" in raw ? raw.view : undefined);
		const savedAt =
			"savedAt" in raw && typeof raw.savedAt === "number" ? raw.savedAt : 0;
		return { status: "ok", stored: { id, doc, view, savedAt } };
	} catch (error) {
		return {
			status: "invalid",
			reason: error instanceof Error ? error.message : String(error),
		};
	}
}

export async function lastOpenedId(): Promise<string | null> {
	const id: unknown = await get(LAST, getStore());
	return typeof id === "string" ? id : null;
}

// Документ, строка индекса и «последний открытый» — одной транзакцией: список не
// может разойтись с тем, что лежит. commit() явный: без него транзакция коммитится,
// только когда страница вернётся в цикл событий, а при уходе со страницы её держит
// модальный вопрос beforeunload, после которого документ выгружается и транзакция
// прерывается. Проверено: правка за 100 мс до F5 терялась даже с вопросом.
export function saveDocument(stored: StoredDocument): Promise<void> {
	return getStore()("readwrite", (s) => {
		const indexRequest = s.get(INDEX);
		indexRequest.onsuccess = () => {
			const current: unknown = indexRequest.result;
			const list = Array.isArray(current) ? current.filter(isSummary) : [];
			const summary = {
				id: stored.id,
				name: stored.doc.name,
				savedAt: stored.savedAt,
			};
			s.put(stored, docKey(stored.id));
			s.put([summary, ...list.filter((d) => d.id !== stored.id)], INDEX);
			s.put(stored.id, LAST);
			s.transaction.commit();
		};
		return promisifyRequest(s.transaction);
	});
}

export function deleteDocument(id: string): Promise<void> {
	return getStore()("readwrite", (s) => {
		const indexRequest = s.get(INDEX);
		indexRequest.onsuccess = () => {
			const current: unknown = indexRequest.result;
			const list = Array.isArray(current) ? current.filter(isSummary) : [];
			s.delete(docKey(id));
			s.put(
				list.filter((d) => d.id !== id),
				INDEX,
			);
			s.transaction.commit();
		};
		return promisifyRequest(s.transaction);
	});
}

// Человеческое объяснение для индикатора сохранения
export function describeSaveError(error: unknown): string {
	if (error instanceof DOMException && error.name === "QuotaExceededError") {
		return "Документ слишком большой для хранилища браузера — сохраните его в файл";
	}
	return "Хранилище браузера недоступно — изменения не переживут перезагрузку, сохраните документ в файл";
}
