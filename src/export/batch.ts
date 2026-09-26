// Экспорт из панели: карточки → PDF одним файлом (по спуску) или SVG/PNG по файлу на
// карточку (несколько — в ZIP). Тяжёлое грузится по требованию: pdf-lib и opentype.js —
// для PDF и SVG в кривых, fflate — только для архива.
import type { CutlineDocument, DataRecord } from "../model/document";
import type { OutlineFonts } from "../render/outline";
import { render, renderedSize } from "../render/render";
import { downloadBlob } from "./download";
import { cardFileName } from "./fileName";
import type { ImposeSettings } from "./imposition";
import { rasterizeSvgToPng } from "./png";

export type ExportFormat = "pdf" | "png" | "svg";

export interface ExportCard {
	record: DataRecord;
	// номер записи в таблице (с 0) — для имени файла
	index: number;
}

export interface ExportJob {
	doc: CutlineDocument;
	cards: ExportCard[];
	// «Только макет»: одна карточка с плейсхолдерами — и имя файла без номера записи
	layoutOnly: boolean;
	format: ExportFormat;
	impose: ImposeSettings; // PDF
	curves: boolean; // SVG; в PDF текст кривыми всегда
	dpi: number; // PNG
	onProgress: (done: number) => void;
}

// Имя без номера записи: у макета её нет, а «001-{{name}}» выглядело бы как ошибка
const LAYOUT_NAME = "cutline-макет";

function fileName(job: ExportJob, card: ExportCard, ext: string): string {
	if (job.layoutOnly) return `${LAYOUT_NAME}.${ext}`;
	const { doc } = job;
	return cardFileName(
		card.index,
		doc.records.length,
		card.record,
		doc.fields,
		ext,
	);
}

async function outlinesFor(doc: CutlineDocument): Promise<OutlineFonts> {
	const { loadOutlineFonts } = await import("../fonts/outlineFonts");
	return loadOutlineFonts(doc);
}

async function cardFile(
	job: ExportJob,
	card: ExportCard,
	outlines: OutlineFonts | null,
): Promise<{ name: string; bytes: Uint8Array }> {
	const { doc, format } = job;
	const opts = { outlines, bleed: false };
	const svg = render(doc, card.record, opts);
	const name = fileName(job, card, format);
	if (format === "svg") return { name, bytes: new TextEncoder().encode(svg) };
	const { widthMm, heightMm } = renderedSize(doc.canvas, opts);
	const png = await rasterizeSvgToPng(svg, widthMm, heightMm, job.dpi);
	return { name, bytes: new Uint8Array(await png.arrayBuffer()) };
}

export async function runExport(job: ExportJob): Promise<void> {
	if (job.format === "pdf") {
		const { buildTiragePdf } = await import("./pdfExport");
		const blob = await buildTiragePdf(
			job.doc,
			job.cards.map((c) => c.record),
			job.impose,
			job.onProgress,
		);
		downloadBlob(blob, job.layoutOnly ? `${LAYOUT_NAME}.pdf` : "cutline.pdf");
		return;
	}
	const outlines =
		job.format === "svg" && job.curves ? await outlinesFor(job.doc) : null;
	const files: { name: string; bytes: Uint8Array }[] = [];
	for (const card of job.cards) {
		files.push(await cardFile(job, card, outlines));
		job.onProgress(files.length);
	}
	const type = job.format === "png" ? "image/png" : "image/svg+xml";
	if (files.length === 1) {
		const [file] = files;
		downloadBlob(new Blob([file.bytes.slice()], { type }), file.name);
		return;
	}
	const { zipSync } = await import("fflate");
	// PNG уже сжат — повторное сжатие только тратит время; SVG — текст, жмётся хорошо
	const zip = zipSync(Object.fromEntries(files.map((f) => [f.name, f.bytes])), {
		level: job.format === "png" ? 0 : 6,
	});
	downloadBlob(
		new Blob([zip.slice()], { type: "application/zip" }),
		`cutline-${job.format}.zip`,
	);
}
