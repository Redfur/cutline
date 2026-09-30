import { describe, expect, it } from "vitest";
import type { CutlineElement, ShowCondition } from "../../model/document";
import { blankDocument } from "../../render/fixtures/blank";
import {
	conditionGhostDocument,
	setCondition,
	sharedCondition,
	suggestConditionValue,
} from "./conditions";

function text(
	id: string,
	content: string,
	condition: ShowCondition | null = null,
	locked = false,
): CutlineElement {
	return {
		id,
		name: id,
		type: "text",
		x: 0,
		y: 0,
		w: 10,
		h: 5,
		rotation: 0,
		locked,
		visible: true,
		condition,
		content,
		font: "Inter",
		weight: 400,
		size: 3,
		minSize: 2,
		lineHeight: 1.2,
		tracking: 0,
		align: "left",
		valign: "top",
		color: "#000",
		mode: "line",
		shrink: false,
		ellipsis: false,
		maxLines: null,
		transform: "none",
	};
}

const filled: ShowCondition = { value: "{{role}}", when: "filled" };

describe("условие показа в инспекторе", () => {
	it("общее условие: одинаковые — не mixed, разные — первое заданное", () => {
		expect(
			sharedCondition([text("a", "", filled), text("b", "", { ...filled })]),
		).toEqual({ condition: filled, mixed: false });
		expect(sharedCondition([text("a", ""), text("b", "", filled)])).toEqual({
			condition: filled,
			mixed: true,
		});
		expect(sharedCondition([text("a", ""), text("b", "")])).toEqual({
			condition: null,
			mixed: false,
		});
	});

	it("подсказка — первое поле содержимого", () => {
		expect(
			suggestConditionValue([text("a", "Гость"), text("b", "{{role}}, {{x}}")]),
		).toBe("{{role}}");
		expect(suggestConditionValue([text("a", "Гость")])).toBe("");
	});

	it("массовая правка не трогает заблокированные и невыделенные", () => {
		const els = [text("a", ""), text("b", "", null, true), text("c", "")];
		const next = setCondition(els, ["a", "b"], filled);
		expect(next.map((el) => el.condition)).toEqual([filled, null, null]);
	});
});

describe("призрак скрытых условием", () => {
	const doc = {
		...blankDocument,
		elements: [
			text("always", "{{role}}"),
			text("plate", "", filled),
			text("guest", "Гость", { value: "{{role}}", when: "empty" }),
			{ ...text("off", "", filled), visible: false },
		],
	};

	it("только скрытые в записи, без условия, на прозрачном фоне", () => {
		const ghost = conditionGhostDocument(doc, { record: { role: "" }, n: 1 });
		expect(ghost?.canvas.background).toBe("transparent");
		expect(
			ghost?.elements.map((el) => [el.id, el.visible, el.condition]),
		).toEqual([
			["always", false, null],
			["plate", true, null],
			["guest", false, doc.elements[2]?.condition],
			["off", false, filled],
		]);
	});

	it("скрытых нет — null", () => {
		const scope = { record: { role: "" }, n: 1 };
		expect(
			conditionGhostDocument({ ...doc, elements: [text("a", "")] }, scope),
		).toBeNull();
	});
});
