import { describe, expect, it } from "vitest";
import {
	parseColor,
	parsePathData,
	placeImage,
	svgToPdfOps,
} from "./svgToPdfOps";

const wrap = (body: string, viewBox = "-3 -3 111 154") =>
	`<svg xmlns="http://www.w3.org/2000/svg" width="111mm" height="154mm" viewBox="${viewBox}">${body}</svg>`;

describe("parseColor", () => {
	it("#RRGGBB и #RGB — в доли единицы", () => {
		expect(parseColor("#FF0080")).toEqual([1, 0, 128 / 255]);
		expect(parseColor("#f00")).toEqual([1, 0, 0]);
	});

	it("none и transparent — без краски", () => {
		expect(parseColor("none")).toBeNull();
		expect(parseColor("transparent")).toBeNull();
	});

	it("неизвестный цвет — понятная ошибка, а не чёрный", () => {
		expect(() => parseColor("red")).toThrow(/#RRGGBB/);
	});
});

describe("parsePathData", () => {
	it("слитные числа opentype.js и неявный L после M", () => {
		expect(parsePathData("M1.5-2L3 4 5 6Z")).toEqual([
			{ op: "M", x: 1.5, y: -2 },
			{ op: "L", x: 3, y: 4 },
			{ op: "L", x: 5, y: 6 },
			{ op: "Z" },
		]);
	});

	it("Q становится C с той же кривой", () => {
		// квадратичная (0,0)→(10,0) с контрольной (5,10): контрольные кубической — на 2/3
		const [, c] = parsePathData("M0 0Q5 10 10 0");
		expect(c).toMatchObject({ op: "C", x: 10, y: 0 });
		if (c.op !== "C") throw new Error();
		expect(c.x1).toBeCloseTo(10 / 3);
		expect(c.y1).toBeCloseTo(20 / 3);
		expect(c.x2).toBeCloseTo(20 / 3);
		expect(c.y2).toBeCloseTo(20 / 3);
	});

	it("после Z текущая точка — начало контура", () => {
		const [, , , q] = parsePathData("M1 1L5 1ZQ1 1 1 1");
		expect(q).toMatchObject({ op: "C", x1: 1, y1: 1 });
	});
});

describe("svgToPdfOps", () => {
	it("viewBox с вылетом", () => {
		expect(svgToPdfOps(wrap("")).viewBox).toEqual({
			x: -3,
			y: -3,
			w: 111,
			h: 154,
		});
	});

	it("прямоугольник, скруглённый прямоугольник, эллипс, линия", () => {
		const { ops } = svgToPdfOps(
			wrap(
				'<rect x="0" y="0" width="10" height="5" fill="#FFFFFF"/>' +
					'<rect x="0" y="0" width="10" height="5" rx="20" fill="none" stroke="#000000" stroke-width="0.3"/>' +
					'<ellipse cx="5" cy="5" rx="2" ry="1" fill="#111111"/>' +
					'<line x1="0" y1="10" x2="20" y2="-5" stroke="#111111" stroke-width="0.5"/>',
			),
		);
		expect(ops.map((op) => op.kind)).toEqual(["path", "path", "path", "path"]);
		const [rect, rounded, ellipse, line] = ops;
		if (
			rect.kind !== "path" ||
			rounded.kind !== "path" ||
			ellipse.kind !== "path" ||
			line.kind !== "path"
		)
			throw new Error();
		expect(rect.segments).toHaveLength(5);
		expect(rect.stroke).toBeNull();
		// радиус больше половины высоты режется до 2.5, как в SVG
		expect(rounded.segments[0]).toEqual({ op: "M", x: 2.5, y: 0 });
		expect(rounded.fill).toBeNull();
		expect(rounded.strokeWidth).toBe(0.3);
		expect(ellipse.segments[0]).toEqual({ op: "M", x: 7, y: 5 });
		expect(line.fill).toBeNull();
		expect(line.segments).toEqual([
			{ op: "M", x: 0, y: 10 },
			{ op: "L", x: 20, y: -5 },
		]);
	});

	it("поворот группы — матрица вокруг центра, закрытие группы — pop", () => {
		const { ops } = svgToPdfOps(
			wrap(
				'<g transform="rotate(90 10 20)"><rect x="0" y="0" width="1" height="1" fill="#000000"/></g>',
			),
		);
		expect(ops.map((op) => op.kind)).toEqual(["push", "path", "pop"]);
		const push = ops[0];
		if (push.kind !== "push") throw new Error();
		// точка (10, 20) — центр — остаётся на месте, (11, 20) уходит в (10, 21)
		const [a, b, c, d, e, f] = push.matrix;
		const apply = (x: number, y: number) => [
			a * x + c * y + e,
			b * x + d * y + f,
		];
		expect(apply(10, 20)[0]).toBeCloseTo(10);
		expect(apply(10, 20)[1]).toBeCloseTo(20);
		expect(apply(11, 20)[0]).toBeCloseTo(10);
		expect(apply(11, 20)[1]).toBeCloseTo(21);
	});

	it("картинка: экранированный href и fit из preserveAspectRatio", () => {
		const { ops } = svgToPdfOps(
			wrap(
				'<image x="1" y="2" width="30" height="40" href="https://e.x/a.png?a=1&amp;b=&quot;2&quot;" preserveAspectRatio="xMidYMid slice"/>' +
					'<image x="1" y="2" width="30" height="40" href="data:image/png;base64,AAA=" preserveAspectRatio="none"/>',
			),
		);
		expect(ops[0]).toMatchObject({
			kind: "image",
			href: 'https://e.x/a.png?a=1&b="2"',
			fit: "cover",
			x: 1,
			w: 30,
		});
		expect(ops[1]).toMatchObject({ fit: "fill" });
	});

	it("текст без кривых и незнакомый тег — ошибка, а не пропуск", () => {
		expect(() => svgToPdfOps(wrap('<text x="0" y="0">Имя</text>'))).toThrow(
			/кривые/,
		);
		expect(() => svgToPdfOps(wrap('<polygon points="0,0 1,1"/>'))).toThrow(
			/polygon/,
		);
	});
});

describe("placeImage", () => {
	const box = { x: 0, y: 0, w: 40, h: 20 };

	it("contain — целиком внутри, по центру", () => {
		expect(placeImage(box, 100, 100, "contain")).toEqual({
			x: 10,
			y: 0,
			w: 20,
			h: 20,
		});
	});

	it("cover — закрывает рамку, по центру", () => {
		expect(placeImage(box, 100, 100, "cover")).toEqual({
			x: 0,
			y: -10,
			w: 40,
			h: 40,
		});
	});

	it("fill — рамка как есть", () => {
		expect(placeImage(box, 100, 100, "fill")).toEqual(box);
	});
});
