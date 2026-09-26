import { PDFDocument } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";
import { loadTestFont } from "../fonts/testFonts";
import type { CutlineDocument } from "../model/document";
import type { OutlineFonts } from "../render/outline";
import { buildPdf, decodeDataUri, type ImageResolver } from "./pdf";

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

async function pdfOf(
	record: Record<string, string>,
	bleed: boolean,
): Promise<PDFDocument> {
	const svg = render(doc, record, { outlines, bleed, marks: false });
	const bytes = await buildPdf(
		[{ svg, trim: { x: 0, y: 0, w: 105, h: 148 } }],
		resolve,
	);
	return PDFDocument.load(bytes);
}

describe("buildPdf", () => {
	it("страница с вылетом: MediaBox и BleedBox — 111×154 мм, TrimBox — обрез", async () => {
		const pdf = await pdfOf({ name: "Тима Фахме" }, true);
		const [page] = pdf.getPages();
		const size = page.getSize();
		expect(size.width).toBeCloseTo(111 * PT, 3);
		expect(size.height).toBeCloseTo(154 * PT, 3);
		const bleedBox = page.getBleedBox();
		expect(bleedBox.width).toBeCloseTo(111 * PT, 3);
		const trim = page.getTrimBox();
		expect(trim.x).toBeCloseTo(3 * PT, 3);
		expect(trim.y).toBeCloseTo(3 * PT, 3);
		expect(trim.width).toBeCloseTo(105 * PT, 3);
		expect(trim.height).toBeCloseTo(148 * PT, 3);
	});

	it("без вылета TrimBox совпадает со страницей", async () => {
		const [page] = (await pdfOf({ name: "Тима" }, false)).getPages();
		expect(page.getSize().width).toBeCloseTo(105 * PT, 3);
		expect(page.getTrimBox()).toMatchObject({ x: 0, y: 0 });
	});

	it("текст — кривыми: в файле нет шрифтов", async () => {
		const svg = render(
			doc,
			{ name: "Константинопольская" },
			{
				outlines,
				bleed: true,
				marks: false,
			},
		);
		expect(svg).not.toContain("<text");
		const bytes = await buildPdf(
			[{ svg, trim: { x: 0, y: 0, w: 105, h: 148 } }],
			resolve,
		);
		const raw = new TextDecoder("latin1").decode(bytes);
		expect(raw).not.toContain("/Font");
		// картинка вшита
		expect(raw).toContain("/Subtype /Image");
	});

	it("одна картинка на нескольких страницах вшивается один раз", async () => {
		const page = {
			svg: render(doc, { name: "А" }, { outlines, bleed: true, marks: false }),
			trim: { x: 0, y: 0, w: 105, h: 148 },
		};
		// у PNG с альфой pdf-lib кладёт ещё и маску (SMask) — считаем относительно одной страницы
		const images = async (pages: (typeof page)[]) =>
			new TextDecoder("latin1")
				.decode(await buildPdf(pages, resolve))
				.match(/\/Subtype \/Image/g)?.length;
		expect(await images([page, page, page])).toBe(await images([page]));
		expect(
			(
				await PDFDocument.load(await buildPdf([page, page], resolve))
			).getPageCount(),
		).toBe(2);
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
