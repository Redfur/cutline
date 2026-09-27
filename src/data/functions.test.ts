import { describe, expect, it } from "vitest";
import { FUNCTIONS, FunctionError } from "./functions";

const call = (name: string, args: string[], n = 1) => {
	const fn = FUNCTIONS[name].call;
	if (!fn) throw new Error(`${name} без call`);
	return fn(args, { n });
};

describe("встроенные функции", () => {
	it("pad: ведущие нули, свой символ, длиннее ширины — как есть", () => {
		expect(call("pad", ["7", "3"])).toBe("007");
		expect(call("pad", ["7", "3", "·"])).toBe("··7");
		expect(call("pad", ["12345", "3"])).toBe("12345");
	});

	it("pad: пустое поле остаётся пустым, ширина не число — ошибка", () => {
		expect(call("pad", ["", "3"])).toBe("");
		expect(() => call("pad", ["7", "три"])).toThrow(FunctionError);
	});

	it("n — номер записи", () => {
		expect(call("n", [], 42)).toBe("42");
	});

	it("default — запасное только для пустого", () => {
		expect(call("default", ["  ", "Гость"])).toBe("Гость");
		expect(call("default", ["Анна", "Гость"])).toBe("Анна");
	});

	it("регистр — с учётом кириллицы", () => {
		expect(call("upper", ["ёжик"])).toBe("ЁЖИК");
		expect(call("lower", ["ЁЖИК"])).toBe("ёжик");
		expect(call("capitalize", ["анна мария"])).toBe("Анна мария");
	});

	it("num — разряды неразрывным пробелом, десятичная запятая", () => {
		expect(call("num", ["12500"])).toBe("12 500");
		expect(call("num", ["1234567.5"])).toBe("1 234 567,5");
		expect(call("num", ["-1 200,25"])).toBe("-1 200,25");
		expect(call("num", ["640"])).toBe("640");
		expect(call("num", [""])).toBe("");
		expect(() => call("num", ["дорого"])).toThrow("не число");
	});
});

describe("описания для справки", () => {
	it("у каждой функции есть имя, описание и пример с её вызовом", () => {
		for (const [name, fn] of Object.entries(FUNCTIONS)) {
			expect(fn.title, name).not.toBe("");
			expect(fn.description, name).not.toBe("");
			expect(fn.example, name).toContain(`${name}(`);
		}
	});
});
