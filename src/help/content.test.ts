import { describe, expect, it } from "vitest";
import { FUNCTIONS } from "../data/functions";
import { LINKED_TOPICS, SECTIONS, topicTitle } from "./content";

const allIds = SECTIONS.flatMap((s) => [
	s.id,
	...(s.items ?? []).map((i) => i.id),
]);

describe("содержание справки", () => {
	it("id разделов и пунктов уникальны", () => {
		expect(new Set(allIds).size).toBe(allIds.length);
	});

	it("всё, на что ссылается интерфейс, есть в справке", () => {
		for (const topic of LINKED_TOPICS) {
			expect(allIds, topic).toContain(topic);
			expect(topicTitle(topic), topic).toBeTruthy();
		}
	});

	it("у каждой функции есть пункт (qr — вместе с инструментом)", () => {
		for (const name of Object.keys(FUNCTIONS)) {
			expect(allIds).toContain(name === "qr" ? "qr" : `fn-${name}`);
		}
	});
});
