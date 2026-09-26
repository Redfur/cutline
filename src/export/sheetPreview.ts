// Превью первого листа в панели экспорта: тот же спуск (pageLayout), что уходит в PDF,
// и настоящие SVG карточек из render(), а не упрощённые блоки, как в мокапе, — чтобы
// превью не врало о переполнении и о том, как карточки встали на лист.
import type { PageLayout } from "./imposition";

// Метки в превью — волосяная линия в пикселях: 0,1 мм на листе шириной 300 px не видно
const PREVIEW_MARK_PX = 0.75;

const SVG_RE = /^<svg\b[^>]*\bviewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>$/;

// Карточка вкладывается своим <svg> с её viewBox — он обрезает всё, что вылезло за
// карточку, как клип в PDF (pdf.ts). Координаты вложенного svg — система карточки,
// на лист её ставит матрица слота.
function nestCard(svg: string, transform: number[]): string {
	const match = SVG_RE.exec(svg);
	if (!match) return "";
	const [x, y, w, h] = match[1].split(/[\s,]+/);
	return (
		`<g transform="matrix(${transform.join(" ")})">` +
		`<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${match[1]}">${match[2]}</svg></g>`
	);
}

export function sheetPreviewSvg(
	layout: PageLayout,
	cardSvgs: string[],
	markColor: string,
): string {
	const { widthMm: w, heightMm: h } = layout;
	const cards = layout.slots
		.map((slot, i) =>
			cardSvgs[i] ? nestCard(cardSvgs[i], slot.transform) : "",
		)
		.join("");
	const marks = layout.marks
		.map(
			(m) =>
				`<line x1="${m.x1}" y1="${m.y1}" x2="${m.x2}" y2="${m.y2}" stroke="${markColor}" stroke-width="${PREVIEW_MARK_PX}" vector-effect="non-scaling-stroke"/>`,
		)
		.join("");
	return (
		// размер — у контейнера превью: лист вписывается в него сам (preserveAspectRatio по умолчанию)
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">` +
		`<rect width="${w}" height="${h}" fill="#FFFFFF"/>${cards}${marks}</svg>`
	);
}
