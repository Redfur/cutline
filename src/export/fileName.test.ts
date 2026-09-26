import { describe, expect, it } from "vitest";
import { cardFileName } from "./fileName";

const fields = [{ key: "name", label: "Имя", sample: "" }];

describe("cardFileName", () => {
	it("номер с нулями и значение первого поля", () => {
		expect(cardFileName(6, 25, { name: "Тима Фахме" }, fields, "png")).toBe(
			"007-Тима Фахме.png",
		);
	});

	it("номер шире трёх знаков, если записей тысячи", () => {
		expect(cardFileName(0, 1200, {}, fields, "svg")).toBe("0001.svg");
	});

	it("запрещённые символы и переводы строк — пробелом", () => {
		expect(cardFileName(0, 3, { name: 'A/B: "C"\nD?' }, fields, "png")).toBe(
			"001-A B C D.png",
		);
	});

	it("точки по краям убираются, длинное имя режется", () => {
		expect(cardFileName(0, 3, { name: "...скрытый." }, fields, "png")).toBe(
			"001-скрытый.png",
		);
		const name = cardFileName(0, 3, { name: "Я".repeat(200) }, fields, "png");
		expect(name.length).toBeLessThanOrEqual(3 + 1 + 60 + 4);
	});

	it("без полей и с пустым значением — только номер", () => {
		expect(cardFileName(1, 3, {}, [], "png")).toBe("002.png");
		expect(cardFileName(1, 3, { name: "  " }, fields, "png")).toBe("002.png");
	});
});
