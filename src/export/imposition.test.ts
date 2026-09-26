import { describe, expect, it } from "vitest";
import {
	type CardSize,
	cropMarks,
	HOME_MARGIN_MM,
	homeMarginHint,
	type ImposeSettings,
	MARK_GAP_MM,
	MARK_LENGTH_MM,
	pageLayout,
	SHEETS,
	sheetFit,
} from "./imposition";

const A6: CardSize = { w: 105, h: 148, bleed: 3 };
const [A4, A3, SRA3] = SHEETS;

const settings = (patch: Partial<ImposeSettings>): ImposeSettings => ({
	sheet: A4,
	bleed: false,
	marks: false,
	homeMargin: false,
	fitToMargin: false,
	...patch,
});

describe("sheetFit", () => {
	it("A6 встык: четыре на книжном A4", () => {
		expect(sheetFit(A6, settings({}))).toMatchObject({
			cols: 2,
			rows: 2,
			perSheet: 4,
			landscape: false,
			widthMm: 210,
			heightMm: 297,
		});
	});

	it("с вылетом и метками A4 разворачивается: две карточки на альбомном", () => {
		expect(sheetFit(A6, settings({ bleed: true, marks: true }))).toMatchObject({
			cols: 2,
			rows: 1,
			perSheet: 2,
			landscape: true,
			widthMm: 297,
			heightMm: 210,
		});
	});

	it("вылет без меток — места под метки не держим", () => {
		// книжный: 210 / 111 = 1; альбомный: 297 / 111 = 2 и 210 / 154 = 1
		expect(sheetFit(A6, settings({ bleed: true })).perSheet).toBe(2);
	});

	it("A3 и SRA3", () => {
		expect(
			sheetFit(A6, settings({ sheet: A3, bleed: true, marks: true })).perSheet,
		).toBe(4);
		expect(sheetFit(A6, settings({ sheet: SRA3 })).perSheet).toBe(9);
	});

	it("одна на странице: страница — карточка, вылет и зона меток", () => {
		expect(
			sheetFit(A6, settings({ sheet: null, bleed: true, marks: true })),
		).toMatchObject({ perSheet: 1, widthMm: 125, heightMm: 168 });
		expect(sheetFit(A6, settings({ sheet: null }))).toMatchObject({
			widthMm: 105,
			heightMm: 148,
		});
	});

	it("карточка больше листа — ноль на листе", () => {
		expect(sheetFit({ w: 400, h: 500, bleed: 3 }, settings({})).perSheet).toBe(
			0,
		);
	});
});

describe("поля для домашнего принтера", () => {
	it("поля отняли карточки — подсказка с уменьшением", () => {
		const home = settings({ homeMargin: true });
		expect(sheetFit(A6, home).perSheet).toBe(2);
		const hint = homeMarginHint(A6, home);
		expect(hint).toMatchObject({ withMargin: 2, withoutMargin: 4 });
		// по ширине 200 / 210, по высоте 287 / 296 — держит меньшее
		expect(hint?.scale).toBeCloseTo(200 / 210, 9);
	});

	it("уменьшение уместить: снова четыре, в масштабе подсказки", () => {
		const fit = sheetFit(A6, settings({ homeMargin: true, fitToMargin: true }));
		expect(fit.perSheet).toBe(4);
		expect(fit.scale).toBeCloseTo(200 / 210, 9);
	});

	it("если поля ничего не отнимают — подсказки нет", () => {
		expect(
			homeMarginHint(
				A6,
				settings({ homeMargin: true, bleed: true, marks: true }),
			),
		).toBeNull();
		expect(homeMarginHint(A6, settings({}))).toBeNull();
		expect(
			homeMarginHint(A6, settings({ sheet: null, homeMargin: true })),
		).toBeNull();
	});

	it("уменьшенный лист отстоит от края на поля", () => {
		const page = pageLayout(
			A6,
			settings({ homeMargin: true, fitToMargin: true }),
		);
		expect(page.slots).toHaveLength(4);
		for (const { trim } of page.slots) {
			expect(trim.x).toBeGreaterThanOrEqual(HOME_MARGIN_MM - 1e-9);
			expect(trim.y).toBeGreaterThanOrEqual(HOME_MARGIN_MM - 1e-9);
			expect(trim.x + trim.w).toBeLessThanOrEqual(210 - HOME_MARGIN_MM + 1e-9);
			expect(trim.y + trim.h).toBeLessThanOrEqual(297 - HOME_MARGIN_MM + 1e-9);
			expect(trim.w).toBeCloseTo((105 * 200) / 210, 9);
		}
	});
});

describe("pageLayout", () => {
	it("одна на странице: обрез и вылет — боксы страницы, 8 меток до края", () => {
		const page = pageLayout(
			A6,
			settings({ sheet: null, bleed: true, marks: true }),
		);
		const offset = 3 + MARK_GAP_MM + MARK_LENGTH_MM;
		expect(page.trim).toEqual({ x: offset, y: offset, w: 105, h: 148 });
		expect(page.bleed).toEqual({
			x: offset - 3,
			y: offset - 3,
			w: 111,
			h: 154,
		});
		expect(page.marks).toHaveLength(8);
		for (const m of page.marks) {
			expect(Math.min(m.x1, m.x2, m.y1, m.y2)).toBeGreaterThanOrEqual(0);
			expect(Math.max(m.x1, m.x2)).toBeLessThanOrEqual(page.widthMm);
			expect(Math.max(m.y1, m.y2)).toBeLessThanOrEqual(page.heightMm);
		}
	});

	it("метки без вылета — от самого обреза, вылет-бокс равен обрезу", () => {
		const page = pageLayout(A6, settings({ sheet: null, marks: true }));
		expect(page.bleed).toEqual(page.trim);
		expect(page.marks[0].y1).toBe(
			page.trim?.y ? page.trim.y - MARK_GAP_MM : NaN,
		);
	});

	it("лист: карточки прямо, по центру, вылеты соседей касаются", () => {
		const page = pageLayout(A6, settings({ bleed: true, marks: true }));
		expect(page).toMatchObject({ widthMm: 297, heightMm: 210 });
		const [a, b] = page.slots;
		// без поворота: матрица — только масштаб и сдвиг
		expect(a.transform).toEqual([1, 0, 0, 1, a.trim.x, a.trim.y]);
		expect(b.trim.x - (a.trim.x + a.trim.w)).toBeCloseTo(6, 9);
		// блок 222 мм по центру 297
		expect(a.trim.x - 3).toBeCloseTo((297 - 222) / 2, 9);
		expect(page.trim).toBeUndefined();
	});
});

describe("cropMarks", () => {
	it("встык линия реза общая — одна метка на линию с каждой стороны", () => {
		const page = pageLayout(A6, settings({ marks: true }));
		// зона меток оставляет на A4 две карточки встык на альбомном листе: вертикальных
		// резов три (средний общий), горизонтальных два — по две метки на рез
		expect(page.slots).toHaveLength(2);
		expect(page.marks).toHaveLength(3 * 2 + 2 * 2);
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
