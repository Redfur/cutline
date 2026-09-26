import { describe, expect, it } from "vitest";
import {
	type CardSize,
	cropMarks,
	HOME_MARGIN_MM,
	type LayoutOption,
	layoutOptions,
	MARK_GAP_MM,
	MARK_LENGTH_MM,
	pageLayout,
} from "./imposition";

const A6: CardSize = { w: 105, h: 148, bleed: 3 };

const byId = (options: LayoutOption[]) =>
	Object.fromEntries(options.map((o) => [o.id, o]));

const apply = ([a, b, c, d, e, f]: number[], x: number, y: number) => [
	a * x + c * y + e,
	b * x + d * y + f,
];

describe("layoutOptions", () => {
	it("A6 встык: четыре на A4, восемь на A3 с поворотом", () => {
		const options = byId(layoutOptions(A6, false));
		expect(options.single.perPage).toBe(1);
		expect(options.A4).toMatchObject({ perPage: 4, scale: 1, margin: 0 });
		expect(options.A3).toMatchObject({ perPage: 8, scale: 1 });
	});

	it("четыре A6 на A4 не оставляют полей — домашний вариант уменьшает", () => {
		const home = byId(layoutOptions(A6, false))["A4-home"];
		expect(home.perPage).toBe(4);
		expect(home.margin).toBe(HOME_MARGIN_MM);
		// по ширине 200 / 210, по высоте 287 / 296 — держит меньшее
		expect(home.scale).toBeCloseTo(200 / 210, 6);
	});

	it("с вылетом и метками на A4 встаёт две карточки, поворотом", () => {
		const options = byId(layoutOptions(A6, true));
		expect(options.A4.perPage).toBe(2);
		expect(options.A3.perPage).toBe(4);
	});

	it("если лист и так оставляет поля, домашнего варианта нет", () => {
		expect(byId(layoutOptions(A6, true))["A4-home"]).toBeUndefined();
	});

	it("карточка больше листа — лист не предлагается", () => {
		const poster: CardSize = { w: 400, h: 500, bleed: 3 };
		expect(layoutOptions(poster, false).map((o) => o.id)).toEqual(["single"]);
	});
});

describe("pageLayout", () => {
	it("одна на странице с метками: страница шире на вылет и зону меток", () => {
		const single = layoutOptions(A6, true)[0];
		const page = pageLayout(A6, single, true);
		const offset = 3 + MARK_GAP_MM + MARK_LENGTH_MM;
		expect(page.widthMm).toBe(105 + 2 * offset);
		expect(page.heightMm).toBe(148 + 2 * offset);
		expect(page.trim).toEqual({ x: offset, y: offset, w: 105, h: 148 });
		expect(page.bleed).toEqual({
			x: offset - 3,
			y: offset - 3,
			w: 111,
			h: 154,
		});
		expect(page.marks).toHaveLength(8);
		// метки упираются в край страницы и не заходят в вылет
		for (const m of page.marks) {
			for (const [x, y] of [
				[m.x1, m.y1],
				[m.x2, m.y2],
			]) {
				expect(x).toBeGreaterThanOrEqual(0);
				expect(y).toBeGreaterThanOrEqual(0);
				expect(x).toBeLessThanOrEqual(page.widthMm);
				expect(y).toBeLessThanOrEqual(page.heightMm);
			}
		}
	});

	it("одна на странице без меток — страница в обрез, как карточка", () => {
		const page = pageLayout(A6, layoutOptions(A6, false)[0], false);
		expect(page).toMatchObject({ widthMm: 105, heightMm: 148, marks: [] });
		expect(page.slots[0].transform).toEqual([1, 0, 0, 1, 0, 0]);
	});

	it("лист: карточки внутри листа, не наезжают, вылеты соседей касаются", () => {
		const option = byId(layoutOptions(A6, true)).A3;
		const page = pageLayout(A6, option, true);
		expect(page.slots).toHaveLength(4);
		const boxes = page.slots.map((s) => s.trim);
		for (const b of boxes) {
			expect(b.x - 3).toBeGreaterThanOrEqual(0);
			expect(b.x + b.w + 3).toBeLessThanOrEqual(297);
		}
		// соседи по строке: между обрезами ровно два вылета
		expect(boxes[1].x - (boxes[0].x + boxes[0].w)).toBeCloseTo(6, 9);
	});

	it("поворот: верх карточки уходит вправо, размер слота переставлен", () => {
		const page = pageLayout(A6, byId(layoutOptions(A6, true)).A4, true);
		const { trim, transform } = page.slots[0];
		expect(trim.w).toBe(148);
		expect(trim.h).toBe(105);
		const [x0, y0] = apply(transform, 0, 0);
		expect(x0).toBeCloseTo(trim.x + trim.w, 9);
		expect(y0).toBeCloseTo(trim.y, 9);
		const [x1, y1] = apply(transform, 105, 148);
		expect(x1).toBeCloseTo(trim.x, 9);
		expect(y1).toBeCloseTo(trim.y + trim.h, 9);
	});

	it("домашний принтер: блок уменьшен и отстоит от края на поля", () => {
		const option = byId(layoutOptions(A6, false))["A4-home"];
		const page = pageLayout(A6, option, false);
		expect(page.slots).toHaveLength(4);
		for (const { trim } of page.slots) {
			expect(trim.x).toBeGreaterThanOrEqual(HOME_MARGIN_MM - 1e-9);
			expect(trim.y).toBeGreaterThanOrEqual(HOME_MARGIN_MM - 1e-9);
			expect(trim.x + trim.w).toBeLessThanOrEqual(210 - HOME_MARGIN_MM + 1e-9);
			expect(trim.y + trim.h).toBeLessThanOrEqual(297 - HOME_MARGIN_MM + 1e-9);
			expect(trim.w).toBeCloseTo(105 * option.scale, 9);
		}
	});
});

describe("cropMarks", () => {
	it("встык линия реза общая — одна метка на линию с каждой стороны", () => {
		const slot = (x: number) => ({
			trim: { x, y: 10, w: 10, h: 10 },
			transform: [1, 0, 0, 1, x, 10] as [
				number,
				number,
				number,
				number,
				number,
				number,
			],
		});
		// три вертикальных реза (0, 10, 20) × 2 стороны + два горизонтальных × 2
		expect(cropMarks([slot(0), slot(10)], 0)).toHaveLength(3 * 2 + 2 * 2);
	});

	it("метка начинается за вылетом с зазором", () => {
		const marks = cropMarks(
			[
				{
					trim: { x: 20, y: 20, w: 10, h: 10 },
					transform: [1, 0, 0, 1, 20, 20],
				},
			],
			3,
		);
		expect(marks[0]).toEqual({
			x1: 20,
			y1: 20 - 3 - MARK_GAP_MM,
			x2: 20,
			y2: 20 - 3 - MARK_GAP_MM - MARK_LENGTH_MM,
		});
	});
});
