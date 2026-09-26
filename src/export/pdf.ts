// Сборка PDF через pdf-lib из SVG render(). Страница — карточка с вылетом: MediaBox и
// BleedBox — обрез плюс вылет, TrimBox — сам обрез; по TrimBox типография режет, по
// BleedBox проверяет, что фон заходит под нож.
//
// Координаты: команды приходят в мм системы SVG (y вниз). Одна матрица в начале
// страницы переводит мм в пункты и переворачивает ось Y — дальше всё рисуется прямо
// в миллиметрах модели, без пересчёта каждой точки.
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
import {
	type Box,
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

export interface PdfPageSource {
	svg: string;
	// обрез в системе координат SVG, мм; всё, что снаружи до viewBox, — вылет
	trim: Box;
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
						? [
								...segmentOperators([
									{ op: "M", x: box.x, y: box.y },
									{ op: "L", x: box.x + box.w, y: box.y },
									{ op: "L", x: box.x + box.w, y: box.y + box.h },
									{ op: "L", x: box.x, y: box.y + box.h },
									{ op: "Z" },
								]),
								clip(),
								endPath(),
							]
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

export async function buildPdf(
	pages: PdfPageSource[],
	resolveImage: ImageResolver,
): Promise<Uint8Array> {
	const pdf = await PDFDocument.create();
	pdf.setCreator("Cutline");
	pdf.setProducer("Cutline (pdf-lib)");
	const images = new Map<string, PDFImage>();
	for (const source of pages) {
		const { viewBox, ops } = svgToPdfOps(source.svg);
		const page = pdf.addPage([viewBox.w * PT_PER_MM, viewBox.h * PT_PER_MM]);
		const { trim } = source;
		page.setBleedBox(0, 0, viewBox.w * PT_PER_MM, viewBox.h * PT_PER_MM);
		page.setTrimBox(
			(trim.x - viewBox.x) * PT_PER_MM,
			// TrimBox в пунктах PDF, y вверх: от нижнего края страницы
			(viewBox.y + viewBox.h - (trim.y + trim.h)) * PT_PER_MM,
			trim.w * PT_PER_MM,
			trim.h * PT_PER_MM,
		);
		page.pushOperators(
			pushGraphicsState(),
			concatTransformationMatrix(
				PT_PER_MM,
				0,
				0,
				-PT_PER_MM,
				-viewBox.x * PT_PER_MM,
				(viewBox.y + viewBox.h) * PT_PER_MM,
			),
			PDFOperator.of(PDFOperatorNames.SetLineMiterLimit, [
				PDFNumber.of(SVG_MITER_LIMIT),
			]),
		);
		await drawOps(pdf, page, ops, resolveImage, images);
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
