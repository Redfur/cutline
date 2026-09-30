import { describe, expect, it } from "vitest";
import { progressFraction } from "./progress";

const at = (value: string, template = "{{p}}") =>
	progressFraction(template, { record: { p: value }, n: 1 });

describe("progressFraction", () => {
	it("число, проценты, запятая и пробелы", () => {
		expect(at("75").fraction).toBe(0.75);
		expect(at("75%").fraction).toBe(0.75);
		expect(at(" 12,5 % ").fraction).toBe(0.125);
		expect(at("0").fraction).toBe(0);
		expect(at("100").errors).toEqual([]);
	});

	it("пусто — ноль без своей ошибки", () => {
		expect(at("")).toEqual({ fraction: 0, errors: [] });
	});

	it("не число — ноль и ошибка с ключом поля", () => {
		const { fraction, errors } = at("абв");
		expect(fraction).toBe(0);
		expect(errors).toEqual([
			{ message: "Заполнение: «абв» — не число", keys: ["p"], static: false },
		]);
	});

	it("вне 0–100 — зажато в границы и ошибка", () => {
		expect(at("120").fraction).toBe(1);
		expect(at("120").errors).toHaveLength(1);
		expect(at("-5").fraction).toBe(0);
		expect(at("-5").errors).toHaveLength(1);
	});

	it("функции в шаблоне работают", () => {
		expect(at("", "{{ default(p, 40) }}").fraction).toBe(0.4);
		expect(progressFraction("50", { record: {}, n: 1 }).fraction).toBe(0.5);
	});
});
