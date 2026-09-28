import { describe, expect, it } from "vitest";
import type { CutlineElement } from "../../model/document";
import {
	alignElements,
	alignTarget,
	distributeElements,
	moveSelectionTo,
	offsetElements,
} from "./align";
import { createLine, createRect } from "./createElement";

function rect(
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	locked = false,
): CutlineElement {
	return { ...createRect({ x: 0, y: 0 }), id, x, y, w, h, locked };
}

function pos(elements: CutlineElement[]) {
	return Object.fromEntries(elements.map((el) => [el.id, [el.x, el.y]]));
}

const card = { x: 0, y: 0, w: 100, h: 50 };

describe("offsetElements", () => {
	it("двигает выделенные, кроме заблокированных", () => {
		const els = [
			rect("a", 0, 0, 5, 5),
			rect("b", 0, 0, 5, 5, true),
			rect("c", 0, 0, 5, 5),
		];
		expect(pos(offsetElements(els, ["a", "b"], 2, 3))).toEqual({
			a: [2, 3],
			b: [0, 0],
			c: [0, 0],
		});
	});
});

describe("alignTarget", () => {
	it("один элемент — карточка, несколько — их общая рамка", () => {
		const els = [rect("a", 10, 10, 5, 5), rect("b", 30, 20, 10, 10)];
		expect(alignTarget(els, ["a"], card)).toEqual(card);
		expect(alignTarget(els, ["a", "b"], card)).toEqual({
			x: 10,
			y: 10,
			w: 30,
			h: 20,
		});
	});
});

describe("alignElements", () => {
	const els = [rect("a", 10, 10, 10, 10), rect("b", 30, 20, 20, 20)];
	const target = { x: 10, y: 10, w: 40, h: 30 };

	it("по краям и центрам", () => {
		expect(pos(alignElements(els, ["a", "b"], "left", target))).toEqual({
			a: [10, 10],
			b: [10, 20],
		});
		expect(pos(alignElements(els, ["a", "b"], "right", target))).toEqual({
			a: [40, 10],
			b: [30, 20],
		});
		expect(pos(alignElements(els, ["a", "b"], "centerY", target))).toEqual({
			a: [10, 20],
			b: [30, 15],
		});
	});

	it("заблокированный остаётся на месте", () => {
		const withLocked = [rect("a", 10, 10, 10, 10, true), els[1]];
		expect(pos(alignElements(withLocked, ["a", "b"], "top", target))).toEqual({
			a: [10, 10],
			b: [30, 10],
		});
	});

	it("линию вверх-влево — по её коробке", () => {
		const line = {
			...createLine({ x: 0, y: 0 }),
			id: "l",
			x: 30,
			y: 30,
			w: -10,
			h: -10,
		};
		// коробка 20..30 — левый край к 0 значит сдвиг на -20
		expect(pos(alignElements([line], ["l"], "left", card))).toEqual({
			l: [10, 30],
		});
	});
});

describe("distributeElements", () => {
	it("равные промежутки, крайние на месте", () => {
		const els = [
			rect("a", 0, 0, 10, 10),
			rect("c", 90, 0, 10, 10),
			rect("b", 20, 0, 20, 10),
		];
		// промежуток: (100 - 40) / 2 = 30 → b встаёт на 40
		expect(pos(distributeElements(els, ["a", "b", "c"], "x"))).toEqual({
			a: [0, 0],
			b: [40, 0],
			c: [90, 0],
		});
	});

	it("меньше трёх — без изменений", () => {
		const els = [rect("a", 0, 0, 10, 10), rect("b", 50, 0, 10, 10)];
		expect(distributeElements(els, ["a", "b"], "x")).toBe(els);
	});
});

describe("moveSelectionTo", () => {
	it("рамка группы встаёт в точку, взаимное положение сохраняется", () => {
		const els = [rect("a", 10, 10, 5, 5), rect("b", 30, 20, 5, 5)];
		expect(pos(moveSelectionTo(els, ["a", "b"], 0, 5))).toEqual({
			a: [0, 5],
			b: [20, 15],
		});
	});
});
