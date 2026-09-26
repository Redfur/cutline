// Экспорт PDF из редактора: проверка шрифтов → кривые → спуск → PDF. Всё, что
// требует браузера (fetch, canvas), — здесь; сборка страниц в pdf.ts от DOM не зависит.
// Грузится лениво из batch.ts вместе с pdf-lib.
import type { CutlineDocument, DataRecord } from "../model/document";
import { render } from "../render/render";
import { type ImposeSettings, pageLayout } from "./imposition";
import { buildPdf, decodeDataUri, type ImageBytes, imposeSheets } from "./pdf";
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

// Тираж одним PDF: карточки по спуску выбранной раскладки, текст кривыми.
// Системный шрифт отсекает диалог (pdfPreflight) — сюда он попасть не должен, но
// проверка стоит и здесь: иначе render() молча оставил бы <text>, и сборка упала бы
// непонятной ошибкой разбора.
export async function buildTiragePdf(
	doc: CutlineDocument,
	records: DataRecord[],
	settings: ImposeSettings,
	onProgress: (done: number) => void,
): Promise<Blob> {
	const problems = pdfFontProblems(doc);
	if (problems.length) {
		throw new Error(pdfFontProblemsMessage(problems));
	}
	// opentype.js — отдельным чанком: вместе с pdf-lib они не влезали в лимит Vite на чанк
	const { loadOutlineFonts } = await import("../fonts/outlineFonts");
	const outlines = await loadOutlineFonts(doc);
	const svgs: string[] = [];
	for (const record of records) {
		svgs.push(render(doc, record, { outlines, bleed: settings.bleed }));
		onProgress(svgs.length);
		// отдать кадр: на сотне карточек иначе замирает и счётчик на кнопке
		await nextFrame();
	}
	const card = { w: doc.canvas.w, h: doc.canvas.h, bleed: doc.canvas.bleed };
	const bytes = await buildPdf(
		imposeSheets(pageLayout(card, settings), svgs),
		resolveImageInBrowser,
	);
	// slice — копия на ArrayBuffer: Blob не принимает представление поверх SharedArrayBuffer
	return new Blob([bytes.slice()], { type: "application/pdf" });
}

export function nextFrame(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}
