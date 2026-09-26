import "fake-indexeddb/auto";
import { createStore, set } from "idb-keyval";
import { describe, expect, it } from "vitest";
import { blankDocument } from "../render/fixtures/blank";
import {
	describeSaveError,
	loadSession,
	type StoredSession,
	saveSession,
} from "./session";

// тот же store, что внутри session.ts, — чтобы подложить туда мусор
const raw = createStore("cutline", "documents");

const session: StoredSession = {
	doc: blankDocument,
	view: { mode: "data", recordIndex: 3 },
	savedAt: 1,
};

describe("session", () => {
	it("пустое хранилище — empty", async () => {
		expect(await loadSession()).toEqual({ status: "empty" });
	});

	it("сохранили → загрузили то же", async () => {
		await saveSession(session);
		expect(await loadSession()).toEqual({ status: "ok", session });
	});

	it("документ с картинкой на несколько МБ проходит круг", async () => {
		const photo = `data:image/png;base64,${"A".repeat(6 * 1024 * 1024)}`;
		const big: StoredSession = {
			...session,
			doc: {
				...blankDocument,
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
					},
				],
			},
		};
		await saveSession(big);
		const loaded = await loadSession();
		expect(loaded.status === "ok" && loaded.session.doc.elements[0]).toEqual(
			big.doc.elements[0],
		);
	});

	it("мусор вместо документа — invalid с причиной, без исключения", async () => {
		await set("current", { doc: { version: "x" } }, raw);
		const loaded = await loadSession();
		expect(loaded.status).toBe("invalid");
		await set("current", "строка", raw);
		expect((await loadSession()).status).toBe("invalid");
	});

	it("битый вид заменяется умолчанием, документ не теряется", async () => {
		await set(
			"current",
			{ doc: blankDocument, view: { mode: "zzz", recordIndex: -4 } },
			raw,
		);
		expect(await loadSession()).toEqual({
			status: "ok",
			session: {
				doc: blankDocument,
				view: { mode: "design", recordIndex: 0 },
				savedAt: 0,
			},
		});
	});

	it("переполнение квоты объясняется отдельно", () => {
		expect(
			describeSaveError(new DOMException("full", "QuotaExceededError")),
		).toMatch(/слишком большой/);
		expect(describeSaveError(new Error("x"))).toMatch(/недоступно/);
	});
});
