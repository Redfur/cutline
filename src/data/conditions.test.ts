import { describe, expect, it } from "vitest";
import type { CutlineElement, ShowCondition } from "../model/document";
import { conditionResult, isShown } from "./conditions";

function rect(condition: ShowCondition | null, visible = true): CutlineElement {
	return {
		id: "r",
		name: "r",
		type: "rect",
		x: 0,
		y: 0,
		w: 10,
		h: 5,
		rotation: 0,
		locked: false,
		visible,
		condition,
		fill: "#000",
		stroke: null,
		strokeWidth: 0,
		radius: 0,
		progress: null,
	};
}

const at = (role: string) => ({ record: { role }, n: 1 });

describe("условие показа", () => {
	it("без условия — показан всегда", () => {
		expect(isShown(rect(null), at(""))).toBe(true);
	});

	it("«заполнено» — по непустому значению без пробелов по краям", () => {
		const el = rect({ value: "{{role}}", when: "filled" });
		expect(isShown(el, at("Директор"))).toBe(true);
		expect(isShown(el, at(""))).toBe(false);
		expect(isShown(el, at("  "))).toBe(false);
	});

	it("«пусто» — наоборот", () => {
		const el = rect({ value: "{{role}}", when: "empty" });
		expect(isShown(el, at(""))).toBe(true);
		expect(isShown(el, at("Директор"))).toBe(false);
	});

	it("скрытый глазом не показывается, даже если условие выполнено", () => {
		const el = rect({ value: "{{role}}", when: "filled" }, false);
		expect(isShown(el, at("Директор"))).toBe(false);
		expect(conditionResult(el, at("Директор")).shown).toBe(true);
	});

	it("ошибка функции — пустота и ошибка с ключом", () => {
		const el = rect({ value: "{{ num(role) }}", when: "filled" });
		const result = conditionResult(el, at("абв"));
		expect(result.shown).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.keys).toEqual(["role"]);
	});
});
