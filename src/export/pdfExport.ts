// Экспорт PDF из редактора: проверка шрифтов → кривые → PDF → файл. Всё, что
// требует браузера (fetch, canvas), — здесь; сборка страниц в pdf.ts от DOM не зависит.
import type { CutlineDocument, DataRecord } from "../model/document";
import { render } from "../render/render";
import { downloadBlob } from "./download";
import { buildPdf, decodeDataUri, type ImageBytes } from "./pdf";
import { pdfFontProblems, pdfFontProblemsMessage } from "./pdfPreflight";

// У SVG без width/height у картинки нет своего размера — растрируем с таким запасом
const FALLBACK_RASTER_PX = 2048;

function shortHref(href: string): string {
	return href.startsWith("data:") ? "из файла" : `«${href.slice(0, 80)}»`;
}

function rasterizeToPng(blob: Blob): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(blob);
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = img.naturalWidth || FALLBACK_RASTER_PX;
			canvas.height = img.naturalHeight || FALLBACK_RASTER_PX;
			const ctx = canvas.getContext("2d");
			URL.revokeObjectURL(url);
			if (!ctx) {
				reject(new Error("2D canvas недоступен"));
				return;
			}
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			canvas.toBlob((png) => {
				if (!png) {
					reject(new Error("не удалось перевести в PNG"));
					return;
				}
				png.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)), reject);
			}, "image/png");
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("браузер не смог её открыть"));
		};
		img.src = url;
	});
}

// PNG и JPEG вшиваются как есть; WebP, GIF, SVG — через canvas в PNG
async function resolveImageInBrowser(href: string): Promise<ImageBytes> {
	const direct = decodeDataUri(href);
	if (direct) return direct;
	try {
		let blob: Blob;
		try {
			const res = await fetch(href);
			if (!res.ok) throw new Error(`сервер ответил ${res.status}`);
			blob = await res.blob();
		} catch (err) {
			// fetch падает TypeError и на CORS, и на отсутствии сети — различить нельзя
			throw err instanceof TypeError
				? new Error("сайт не отдаёт её другим страницам (CORS) или нет сети")
				: err;
		}
		if (blob.type === "image/png" || blob.type === "image/jpeg") {
			const bytes = new Uint8Array(await blob.arrayBuffer());
			return { kind: blob.type === "image/png" ? "png" : "jpg", bytes };
		}
		return { kind: "png", bytes: await rasterizeToPng(blob) };
	} catch (err) {
		throw new Error(
			`Картинка ${shortHref(href)} не попала в PDF: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

export async function downloadPdf(
	doc: CutlineDocument,
	record: DataRecord,
	filename: string,
): Promise<void> {
	const problems = pdfFontProblems(doc);
	if (problems.length) {
		throw new Error(pdfFontProblemsMessage(problems));
	}
	// opentype.js — отдельным чанком: вместе с pdf-lib они не влезали в лимит Vite на чанк
	const { loadOutlineFonts } = await import("../fonts/outlineFonts");
	const outlines = await loadOutlineFonts(doc);
	const svg = render(doc, record, { outlines, bleed: true, marks: false });
	const bytes = await buildPdf(
		[{ svg, trim: { x: 0, y: 0, w: doc.canvas.w, h: doc.canvas.h } }],
		resolveImageInBrowser,
	);
	// slice — копия на ArrayBuffer: Blob не принимает представление поверх SharedArrayBuffer
	downloadBlob(
		new Blob([bytes.slice()], { type: "application/pdf" }),
		filename,
	);
}
