// Сборка PDF через pdf-lib из SVG render(). Страница — лист из спуска полос
// (imposition.ts): одна карточка с вылетом и метками или несколько на A4/A3. У страницы
// на одну карточку TrimBox — обрез, BleedBox — обрез плюс вылет: по ним типография
// режет и проверяет, что фон заходит под нож. Лист режут по меткам — там боксы не нужны.
//
// Координаты: одна матрица в начале страницы переводит мм листа в пункты и
// переворачивает ось Y; карточка ставится своей матрицей из спуска, и её команды идут
// прямо в миллиметрах SVG, без пересчёта каждой точки.
import {
	appendBezierCurve,
	clip,
	closePath,
	concatTransformationMatrix,
	drawObject,
	endPath,
	fill,
	fillAndStroke,
	lineTo,
	moveTo,
	PDFDocument,
	type PDFImage,
	PDFNumber,
	PDFOperator,
	PDFOperatorNames,
	type PDFPage,
	popGraphicsState,
	pushGraphicsState,
	setFillingRgbColor,
	setLineWidth,
	setStrokingRgbColor,
	stroke,
} from "pdf-lib";
import { type Line, MARK_STROKE_MM, type PageLayout } from "./imposition";
import {
	type Box,
	type Matrix,
	type PdfOp,
	placeImage,
	type Segment,
	svgToPdfOps,
} from "./svgToPdfOps";

const PT_PER_MM = 72 / 25.4;

// SVG по умолчанию — 4, PDF — 10: без этого острые углы обводки в PDF торчали бы
// дальше, чем на экране
const SVG_MITER_LIMIT = 4;

export interface ImageBytes {
	kind: "png" | "jpg";
	bytes: Uint8Array;
}

// Картинка по href из SVG → байты, которые pdf-lib умеет вшить. В браузере — с
// растеризацией форматов, которых PDF не знает (resolveImageInBrowser), в тестах —
// своя, без DOM.
export type ImageResolver = (href: string) => Promise<ImageBytes>;

export interface PdfCard {
	svg: string;
	// из координат SVG карточки в мм листа (Slot.transform из спуска)
	transform: Matrix;
}

export interface PdfSheet {
	widthMm: number;
	heightMm: number;
	// в мм листа; без них — вся страница
	trim?: Box;
	bleed?: Box;
	cards: PdfCard[];
	marks: Line[];
}

function segmentOperators(segments: Segment[]): PDFOperator[] {
	return segments.map((s) => {
		if (s.op === "M") return moveTo(s.x, s.y);
		if (s.op === "L") return lineTo(s.x, s.y);
		if (s.op === "C")
			return appendBezierCurve(s.x1, s.y1, s.x2, s.y2, s.x, s.y);
		return closePath();
	});
}

async function drawOps(
	pdf: PDFDocument,
	page: PDFPage,
	ops: PdfOp[],
	resolveImage: ImageResolver,
	images: Map<string, PDFImage>,
): Promise<void> {
	for (const op of ops) {
		switch (op.kind) {
			case "push":
				page.pushOperators(
					pushGraphicsState(),
					concatTransformationMatrix(...op.matrix),
				);
				break;
			case "pop":
				page.pushOperators(popGraphicsState());
				break;
			case "path": {
				if (!op.fill && !op.stroke) break;
				const paint =
					op.fill && op.stroke ? fillAndStroke() : op.fill ? fill() : stroke();
				page.pushOperators(
					pushGraphicsState(),
					...(op.fill ? [setFillingRgbColor(...op.fill)] : []),
					...(op.stroke
						? [setStrokingRgbColor(...op.stroke), setLineWidth(op.strokeWidth)]
						: []),
					...segmentOperators(op.segments),
					paint,
					popGraphicsState(),
				);
				break;
			}
			case "image": {
				if (!op.href) break;
				let image = images.get(op.href);
				if (!image) {
					const { kind, bytes } = await resolveImage(op.href);
					image =
						kind === "png"
							? await pdf.embedPng(bytes)
							: await pdf.embedJpg(bytes);
					// одна и та же картинка на всех страницах вшивается один раз
					images.set(op.href, image);
				}
				const box: Box = { x: op.x, y: op.y, w: op.w, h: op.h };
				const at = placeImage(box, image.width, image.height, op.fit);
				const name = page.node.newXObject("Image", image.ref);
				page.pushOperators(
					pushGraphicsState(),
					// cover выходит за рамку — обрезаем по ней, как slice в SVG
					...(op.fit === "cover"
						? [...segmentOperators(boxSegments(box)), clip(), endPath()]
						: []),
					// картинка в PDF — единичный квадрат с y вверх; в нашей системе y вниз,
					// поэтому высота с минусом и начало — у нижнего края
					concatTransformationMatrix(at.w, 0, 0, -at.h, at.x, at.y + at.h),
					drawObject(name),
					popGraphicsState(),
				);
				break;
			}
		}
	}
}

// Карточки тиража по местам листа, лист за листом; последний может быть неполным
export function imposeSheets(layout: PageLayout, svgs: string[]): PdfSheet[] {
	const perSheet = layout.slots.length;
	const sheets: PdfSheet[] = [];
	for (let i = 0; i < svgs.length; i += perSheet) {
		sheets.push({
			widthMm: layout.widthMm,
			heightMm: layout.heightMm,
			trim: layout.trim,
			bleed: layout.bleed,
			cards: svgs.slice(i, i + perSheet).map((svg, j) => ({
				svg,
				transform: layout.slots[j].transform,
			})),
			marks: layout.marks,
		});
	}
	return sheets;
}

function boxSegments(box: Box): Segment[] {
	return [
		{ op: "M", x: box.x, y: box.y },
		{ op: "L", x: box.x + box.w, y: box.y },
		{ op: "L", x: box.x + box.w, y: box.y + box.h },
		{ op: "L", x: box.x, y: box.y + box.h },
		{ op: "Z" },
	];
}

// Бокс PDF — в пунктах от нижнего левого угла страницы
function setBox(
	set: (x: number, y: number, w: number, h: number) => void,
	box: Box,
	sheetHeightMm: number,
): void {
	set(
		box.x * PT_PER_MM,
		(sheetHeightMm - box.y - box.h) * PT_PER_MM,
		box.w * PT_PER_MM,
		box.h * PT_PER_MM,
	);
}

export async function buildPdf(
	sheets: PdfSheet[],
	resolveImage: ImageResolver,
): Promise<Uint8Array> {
	const pdf = await PDFDocument.create();
	pdf.setCreator("Cutline");
	pdf.setProducer("Cutline (pdf-lib)");
	const images = new Map<string, PDFImage>();
	for (const sheet of sheets) {
		const page = pdf.addPage([
			sheet.widthMm * PT_PER_MM,
			sheet.heightMm * PT_PER_MM,
		]);
		if (sheet.bleed) {
			setBox(page.setBleedBox.bind(page), sheet.bleed, sheet.heightMm);
		}
		if (sheet.trim) {
			setBox(page.setTrimBox.bind(page), sheet.trim, sheet.heightMm);
		}
		page.pushOperators(
			pushGraphicsState(),
			concatTransformationMatrix(
				PT_PER_MM,
				0,
				0,
				-PT_PER_MM,
				0,
				sheet.heightMm * PT_PER_MM,
			),
			PDFOperator.of(PDFOperatorNames.SetLineMiterLimit, [
				PDFNumber.of(SVG_MITER_LIMIT),
			]),
		);
		for (const card of sheet.cards) {
			const { viewBox, ops } = svgToPdfOps(card.svg);
			page.pushOperators(
				pushGraphicsState(),
				concatTransformationMatrix(...card.transform),
				// SVG обрезает всё за viewBox; одиночную страницу обрезал её край, а на листе
				// элемент, вылезший за карточку, заехал бы на соседнюю
				...segmentOperators(boxSegments(viewBox)),
				clip(),
				endPath(),
			);
			await drawOps(pdf, page, ops, resolveImage, images);
			page.pushOperators(popGraphicsState());
		}
		if (sheet.marks.length) {
			page.pushOperators(
				pushGraphicsState(),
				// чистый чёрный: метки печатаются на каждом листе и не должны зависеть от цвета макета
				setStrokingRgbColor(0, 0, 0),
				setLineWidth(MARK_STROKE_MM),
				...sheet.marks.flatMap((m) => [moveTo(m.x1, m.y1), lineTo(m.x2, m.y2)]),
				stroke(),
				popGraphicsState(),
			);
		}
		page.pushOperators(popGraphicsState());
	}
	return pdf.save();
}

// data:image/png;base64,… и data:image/jpeg;base64,… вшиваются как есть
export function decodeDataUri(href: string): ImageBytes | null {
	const match = /^data:image\/(png|jpe?g);base64,(.*)$/i.exec(href);
	if (!match) return null;
	const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
	return { kind: match[1].toLowerCase() === "png" ? "png" : "jpg", bytes };
}
