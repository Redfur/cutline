import { PDFDocument } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";
import { loadTestFont } from "../fonts/testFonts";
import type { CutlineDocument } from "../model/document";
import type { OutlineFonts } from "../render/outline";
import { layoutOptions, pageLayout } from "./imposition";
import {
	buildPdf,
	decodeDataUri,
	type ImageResolver,
	imposeSheets,
} from "./pdf";

const golos = loadTestFont("GolosText-Regular.ttf");

// В node нет canvas: measureText меряет тем же шрифтом через opentype — раскладка
// строк получается настоящей, как в браузере со встроенным шрифтом
beforeAll(() => {
	let size = 0;
	const fakeContext = {
		set font(value: string) {
			size = Number.parseFloat(/([\d.]+)px/.exec(value)?.[1] ?? "0");
		},
		measureText: (text: string) => ({
			width: golos.getAdvanceWidth(text, size, { kerning: true }),
			fontBoundingBoxAscent: (golos.ascender / golos.unitsPerEm) * size,
			fontBoundingBoxDescent: (-golos.descender / golos.unitsPerEm) * size,
		}),
	};
	Object.assign(globalThis, {
		document: { createElement: () => ({ getContext: () => fakeContext }) },
	});
});

const { render } = await import("../render/render");

const PT = 72 / 25.4;
// 1×1 прозрачный PNG
const PNG =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const resolve: ImageResolver = async (href) => {
	const bytes = decodeDataUri(href);
	if (!bytes) throw new Error(`нет картинки ${href}`);
	return bytes;
};

const base = {
	rotation: 0,
	locked: false,
	visible: true,
};

const doc: CutlineDocument = {
	version: 2,
	canvas: { w: 105, h: 148, bleed: 3, safe: 5, background: "#FFFFFF" },
	fonts: [],
	fields: [{ key: "name", label: "Имя", sample: "" }],
	records: [],
	guides: [],
	elements: [
		{
			...base,
			id: "frame",
			name: "Рамка",
			type: "rect",
			x: 5,
			y: 5,
			w: 95,
			h: 138,
			fill: null,
			stroke: "#DDDCD6",
			strokeWidth: 0.3,
			radius: 4,
		},
		{
			...base,
			id: "dot",
			name: "Точка",
			type: "ellipse",
			x: 10,
			y: 10,
			w: 8,
			h: 8,
			fill: "#E4572E",
			stroke: null,
			strokeWidth: 0,
			rotation: 30,
		},
		{
			...base,
			id: "rule",
			name: "Линия",
			type: "line",
			x: 10,
			y: 100,
			w: 60,
			h: -20,
			stroke: "#111111",
			strokeWidth: 0.5,
		},
		{
			...base,
			id: "photo",
			name: "Фото",
			type: "image",
			x: 60,
			y: 10,
			w: 30,
			h: 40,
			src: PNG,
			fit: "cover",
		},
		{
			...base,
			id: "name",
			name: "Имя",
			type: "text",
			x: 10,
			y: 60,
			w: 85,
			h: 12,
			content: "{{name}}",
			font: "Golos Text",
			weight: "regular",
			size: 8,
			minSize: 4,
			lineHeight: 1.2,
			tracking: 0,
			align: "center",
			valign: "middle",
			color: "#111111",
			fit: "shrink",
			transform: "none",
		},
	],
};

const outlines: OutlineFonts = (family, weight) =>
	family === "Golos Text" && weight === "regular" ? golos : undefined;

const card = { w: 105, h: 148, bleed: 3 };

function sheets(
	records: Record<string, string>[],
	layoutId: string,
	printMarks: boolean,
) {
	const option = layoutOptions(card, printMarks).find((o) => o.id === layoutId);
	if (!option) throw new Error(`нет раскладки ${layoutId}`);
	const svgs = records.map((r) =>
		render(doc, r, { outlines, bleed: printMarks }),
	);
	return imposeSheets(pageLayout(card, option, printMarks), svgs);
}

async function pdfOf(
	records: Record<string, string>[],
	layoutId: string,
	printMarks: boolean,
): Promise<PDFDocument> {
	return PDFDocument.load(
		await buildPdf(sheets(records, layoutId, printMarks), resolve),
	);
}

const raw = async (s: ReturnType<typeof sheets>) =>
	new TextDecoder("latin1").decode(await buildPdf(s, resolve));

describe("buildPdf", () => {
	it("одна на странице с метками: страница — обрез + вылет + зона меток, боксы по обрезу и вылету", async () => {
		const pdf = await pdfOf([{ name: "Тима Фахме" }], "single", true);
		const [page] = pdf.getPages();
		const size = page.getSize();
		// 3 мм вылета + 7 мм под метки с каждой стороны
		expect(size.width).toBeCloseTo(125 * PT, 3);
		expect(size.height).toBeCloseTo(168 * PT, 3);
		const bleedBox = page.getBleedBox();
		expect(bleedBox.x).toBeCloseTo(7 * PT, 3);
		expect(bleedBox.width).toBeCloseTo(111 * PT, 3);
		const trim = page.getTrimBox();
		expect(trim.x).toBeCloseTo(10 * PT, 3);
		expect(trim.y).toBeCloseTo(10 * PT, 3);
		expect(trim.width).toBeCloseTo(105 * PT, 3);
		expect(trim.height).toBeCloseTo(148 * PT, 3);
	});

	it("без меток и вылета — страница в обрез", async () => {
		const [page] = (
			await pdfOf([{ name: "Тима" }], "single", false)
		).getPages();
		expect(page.getSize().width).toBeCloseTo(105 * PT, 3);
		expect(page.getTrimBox()).toMatchObject({ x: 0, y: 0 });
	});

	it("все записи одним файлом: по странице на карточку", async () => {
		const pdf = await pdfOf(
			[{ name: "А" }, { name: "Б" }, { name: "В" }],
			"single",
			true,
		);
		expect(pdf.getPageCount()).toBe(3);
	});

	it("спуск на A4: встык четыре на листе, пятая уходит на второй лист", async () => {
		const records = ["А", "Б", "В", "Г", "Д"].map((name) => ({ name }));
		const pdf = await pdfOf(records, "A4", false);
		expect(pdf.getPageCount()).toBe(2);
		const [page] = pdf.getPages();
		expect(page.getSize().width).toBeCloseTo(210 * PT, 3);
		expect(page.getSize().height).toBeCloseTo(297 * PT, 3);
		// лист режут по меткам — TrimBox совпадает со страницей
		expect(page.getTrimBox().width).toBeCloseTo(210 * PT, 3);
	});

	it("текст — кривыми: в файле нет шрифтов", async () => {
		const s = sheets([{ name: "Константинопольская" }], "A3", true);
		expect(s[0].cards[0].svg).not.toContain("<text");
		const text = await raw(s);
		expect(text).not.toContain("/Font");
		expect(text).toContain("/Subtype /Image");
	});

	it("одна картинка на всём тираже вшивается один раз", async () => {
		const one = sheets([{ name: "А" }], "single", true);
		const many = sheets(
			[{ name: "А" }, { name: "Б" }, { name: "В" }],
			"A3",
			true,
		);
		// у PNG с альфой pdf-lib кладёт ещё и маску (SMask) — сравниваем с одной карточкой
		const images = async (s: typeof one) =>
			(await raw(s)).match(/\/Subtype \/Image/g)?.length;
		expect(await images(many)).toBe(await images(one));
	});
});

describe("imposeSheets", () => {
	it("раскладывает по местам листа по порядку, последний лист неполный", () => {
		const layout = pageLayout(
			card,
			layoutOptions(card, false).find((o) => o.id === "A4") ??
				layoutOptions(card, false)[0],
			false,
		);
		const result = imposeSheets(layout, ["1", "2", "3", "4", "5", "6"]);
		expect(result.map((s) => s.cards.map((c) => c.svg))).toEqual([
			["1", "2", "3", "4"],
			["5", "6"],
		]);
		expect(result[1].cards[1].transform).toEqual(layout.slots[1].transform);
		expect(result[1].marks).toEqual([]);
	});
});

describe("decodeDataUri", () => {
	it("PNG и JPEG — как есть, прочее — null (растрирует браузер)", () => {
		expect(decodeDataUri(PNG)?.kind).toBe("png");
		expect(decodeDataUri("data:image/jpeg;base64,AAAA")?.kind).toBe("jpg");
		expect(decodeDataUri("data:image/webp;base64,AAAA")).toBeNull();
		expect(decodeDataUri("https://example.com/a.png")).toBeNull();
	});
});
