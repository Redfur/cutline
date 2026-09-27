import "fake-indexeddb/auto";
import { clear, createStore, get, keys, set } from "idb-keyval";
import { beforeEach, describe, expect, it } from "vitest";
import { blankDocument } from "../render/fixtures/blank";
import {
	deleteDocument,
	describeSaveError,
	lastOpenedId,
	listDocuments,
	loadDocument,
	rememberOpened,
	type StoredDocument,
	saveDocument,
} from "./documents";

// тот же store, что внутри documents.ts, — чтобы подложить туда мусор и старую сессию
const raw = createStore("cutline", "documents");

const view = {
	mode: "data" as const,
	recordIndex: 3,
	borders: { trim: true, bleed: false, safe: true },
};

const stored = (id: string, name: string, savedAt: number): StoredDocument => ({
	id,
	doc: { ...blankDocument, name },
	view,
	savedAt,
});

beforeEach(async () => {
	await clear(raw);
});

describe("документы", () => {
	it("пустое хранилище — пустой список, последнего нет", async () => {
		expect(await listDocuments()).toEqual([]);
		expect(await lastOpenedId()).toBeNull();
		expect(await loadDocument("нет")).toEqual({ status: "missing" });
	});

	it("сохранили → загрузили то же; в списке имя и время", async () => {
		const a = stored("a", "Бейджи", 1);
		await saveDocument(a);
		expect(await loadDocument("a")).toEqual({ status: "ok", stored: a });
		expect(await listDocuments()).toEqual([
			{ id: "a", name: "Бейджи", savedAt: 1 },
		]);
	});

	it("последний открытый — тот, что открыли, а не тот, что сохранили позже", async () => {
		await saveDocument(stored("a", "Бейджи", 1));
		await saveDocument(stored("b", "Ценники", 2));
		// переключились на a без правок, потом дописалось отложенное сохранение b
		await rememberOpened("a");
		await saveDocument(stored("b", "Ценники", 3));
		expect(await lastOpenedId()).toBe("a");
	});

	it("список — свежие сверху; повторное сохранение обновляет строку, а не добавляет", async () => {
		await saveDocument(stored("a", "Бейджи", 1));
		await saveDocument(stored("b", "Ценники", 2));
		await saveDocument(stored("a", "Бейджи осень", 3));
		expect(await listDocuments()).toEqual([
			{ id: "a", name: "Бейджи осень", savedAt: 3 },
			{ id: "b", name: "Ценники", savedAt: 2 },
		]);
	});

	it("удаление убирает и документ, и строку списка", async () => {
		await saveDocument(stored("a", "Бейджи", 1));
		await saveDocument(stored("b", "Ценники", 2));
		await deleteDocument("a");
		expect(await loadDocument("a")).toEqual({ status: "missing" });
		expect((await listDocuments()).map((d) => d.id)).toEqual(["b"]);
	});

	it("запись в удалённый документ не воскрешает его (поздний flush автосохранения)", async () => {
		await saveDocument(stored("z", "Черновик", 1));
		await deleteDocument("z");
		await saveDocument(stored("z", "Черновик", 2));
		expect(await loadDocument("z")).toEqual({ status: "missing" });
		expect(await listDocuments()).toEqual([]);
	});

	it("документ с картинкой на несколько МБ проходит круг", async () => {
		const photo = `data:image/png;base64,${"A".repeat(6 * 1024 * 1024)}`;
		const big = stored("big", "Фото", 1);
		big.doc = {
			...big.doc,
			elements: [
				{
					id: "p",
					name: "Фото",
					type: "image",
					x: 0,
					y: 0,
					w: 10,
					h: 10,
					rotation: 0,
					locked: false,
					visible: true,
					src: photo,
					fit: "cover",
					background: null,
				},
			],
		};
		await saveDocument(big);
		const loaded = await loadDocument("big");
		expect(loaded.status === "ok" && loaded.stored.doc.elements[0]).toEqual(
			big.doc.elements[0],
		);
	});

	it("мусор вместо документа — invalid с причиной, без исключения", async () => {
		await set("doc:x", { doc: { version: "x" } }, raw);
		expect((await loadDocument("x")).status).toBe("invalid");
		await set("doc:y", "строка", raw);
		expect((await loadDocument("y")).status).toBe("invalid");
	});

	it("битый вид заменяется умолчанием, документ не теряется", async () => {
		await set(
			"doc:v",
			{ doc: blankDocument, view: { mode: "zzz", recordIndex: -4 } },
			raw,
		);
		const loaded = await loadDocument("v");
		expect(loaded.status === "ok" && loaded.stored.view).toEqual({
			mode: "design",
			recordIndex: 0,
			borders: { trim: true, bleed: true, safe: true },
		});
	});

	it("галочки границ: не-булево и отсутствие — видно, false — скрыто", async () => {
		await set(
			"doc:g",
			{
				doc: blankDocument,
				view: {
					mode: "design",
					recordIndex: 0,
					borders: { bleed: false, trim: "x" },
				},
			},
			raw,
		);
		const loaded = await loadDocument("g");
		expect(loaded.status === "ok" && loaded.stored.view.borders).toEqual({
			trim: true,
			bleed: false,
			safe: true,
		});
	});

	it("битый индекс не роняет список: мусорные строки отбрасываются", async () => {
		await set(
			"index",
			[{ id: "a", name: "A", savedAt: 1 }, 42, { id: 1 }],
			raw,
		);
		expect(await listDocuments()).toEqual([{ id: "a", name: "A", savedAt: 1 }]);
	});
});

describe("перенос одиночной сессии до Этапа 5", () => {
	it("current становится документом списка и последним открытым, current удаляется", async () => {
		// старая сессия v2 — имя появится при загрузке (миграция v3)
		const legacyDoc = {
			...blankDocument,
			version: 2,
			name: undefined,
			records: [{ a: "1" }],
		};
		await set("current", { doc: legacyDoc, view, savedAt: 5 }, raw);
		const [summary] = await listDocuments();
		expect(summary).toMatchObject({ name: "Без названия", savedAt: 5 });
		expect(await lastOpenedId()).toBe(summary.id);
		expect(await get("current", raw)).toBeUndefined();
		const loaded = await loadDocument(summary.id);
		expect(loaded.status).toBe("ok");
		if (loaded.status === "ok") {
			expect(loaded.stored.doc.records).toEqual([{ a: "1" }]);
			expect(loaded.stored.view).toEqual(view);
		}
	});

	it("битая старая сессия не пропадает — в списке, но не открывается", async () => {
		await set("current", { doc: { version: "x" } }, raw);
		const [summary] = await listDocuments();
		expect(summary.name).toBe("Без названия");
		expect((await loadDocument(summary.id)).status).toBe("invalid");
	});

	it("два одновременных чтения переносят сессию один раз", async () => {
		await set("current", { doc: blankDocument, view, savedAt: 5 }, raw);
		const [a, b] = await Promise.all([listDocuments(), listDocuments()]);
		expect(a).toEqual(b);
		const docKeys = (await keys(raw)).filter((k) =>
			String(k).startsWith("doc:"),
		);
		expect(docKeys).toHaveLength(1);
	});

	it("переносится один раз", async () => {
		await set("current", { doc: blankDocument, view, savedAt: 5 }, raw);
		await listDocuments();
		expect(await listDocuments()).toHaveLength(1);
	});
});

describe("describeSaveError", () => {
	it("переполнение квоты объясняется отдельно", () => {
		expect(
			describeSaveError(new DOMException("full", "QuotaExceededError")),
		).toMatch(/слишком большой/);
		expect(describeSaveError(new Error("x"))).toMatch(/недоступно/);
	});
});
