import { describe, expect, it } from "vitest";
import { pageLayout, SHEETS } from "./imposition";
import { sheetPreviewSvg } from "./sheetPreview";

const card = { w: 105, h: 148, bleed: 3 };
const cardSvg = (fill: string) =>
	`<svg xmlns="http://www.w3.org/2000/svg" width="111mm" height="154mm" viewBox="-3 -3 111 154"><rect x="0" y="0" width="10" height="10" fill="${fill}"/></svg>`;

describe("sheetPreviewSvg", () => {
	const layout = pageLayout(card, {
		sheet: SHEETS[0],
		bleed: true,
		marks: true,
		homeMargin: false,
		fitToMargin: false,
	});

	it("лист в мм с белым фоном, размер — у контейнера", () => {
		const svg = sheetPreviewSvg(layout, [], "#000");
		expect(svg).toContain('viewBox="0 0 297 210"');
		expect(svg).toContain('fill="#FFFFFF"');
	});

	it("карточки — по местам листа, вложенным svg со своим viewBox (обрезка по карточке)", () => {
		const svg = sheetPreviewSvg(
			layout,
			[cardSvg("#111111"), cardSvg("#222222")],
			"#000",
		);
		const [a, b] = layout.slots;
		expect(svg).toContain(`<g transform="matrix(${a.transform.join(" ")})">`);
		expect(svg).toContain(`<g transform="matrix(${b.transform.join(" ")})">`);
		expect(svg).toContain(
			'<svg x="-3" y="-3" width="111" height="154" viewBox="-3 -3 111 154">',
		);
		expect(svg).toContain("#111111");
		expect(svg).toContain("#222222");
	});

	it("незаполненные места листа пустые", () => {
		const svg = sheetPreviewSvg(layout, [cardSvg("#111111")], "#000");
		expect(svg.match(/<g transform/g)).toHaveLength(1);
	});

	it("метки — волосяной линией заданного цвета", () => {
		const svg = sheetPreviewSvg(layout, [], "var(--guide-trim)");
		expect(svg.match(/<line /g)).toHaveLength(layout.marks.length);
		expect(svg).toContain('stroke="var(--guide-trim)"');
		expect(svg).toContain('vector-effect="non-scaling-stroke"');
	});
});
