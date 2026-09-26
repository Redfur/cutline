// Экспорт тиража из диалога: выбранные записи → PDF одним файлом, или PNG/SVG по
// файлу на карточку (несколько — в ZIP). Тяжёлое грузится по требованию: pdf-lib и
// opentype.js — только для PDF, fflate — только для архива.
import type { CutlineDocument, DataRecord } from "../model/document";
import { render, renderedSize } from "../render/render";
import { downloadBlob } from "./download";
import { cardFileName } from "./fileName";
import type { LayoutOption } from "./imposition";
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
	format: ExportFormat;
	layout: LayoutOption;
	printMarks: boolean;
	onProgress: (done: number) => void;
}

const PNG_DPI = 300;

async function cardFile(
	job: ExportJob,
	card: ExportCard,
	ext: "png" | "svg",
): Promise<{ name: string; bytes: Uint8Array }> {
	const { doc } = job;
	const opts = { outlines: null, bleed: false };
	const svg = render(doc, card.record, opts);
	const name = cardFileName(
		card.index,
		doc.records.length,
		card.record,
		doc.fields,
		ext,
	);
	if (ext === "svg") return { name, bytes: new TextEncoder().encode(svg) };
	const { widthMm, heightMm } = renderedSize(doc.canvas, opts);
	const png = await rasterizeSvgToPng(svg, widthMm, heightMm, PNG_DPI);
	return { name, bytes: new Uint8Array(await png.arrayBuffer()) };
}

export async function runExport(job: ExportJob): Promise<void> {
	if (job.format === "pdf") {
		const { buildTiragePdf } = await import("./pdfExport");
		const blob = await buildTiragePdf(
			job.doc,
			job.cards.map((c) => c.record),
			job.layout,
			job.printMarks,
			job.onProgress,
		);
		downloadBlob(blob, "cutline.pdf");
		return;
	}
	const ext = job.format;
	const files: { name: string; bytes: Uint8Array }[] = [];
	for (const card of job.cards) {
		files.push(await cardFile(job, card, ext));
		job.onProgress(files.length);
	}
	const type = ext === "png" ? "image/png" : "image/svg+xml";
	if (files.length === 1) {
		const [file] = files;
		downloadBlob(new Blob([file.bytes.slice()], { type }), file.name);
		return;
	}
	const { zipSync } = await import("fflate");
	// PNG уже сжат — повторное сжатие только тратит время; SVG — текст, жмётся хорошо
	const zip = zipSync(Object.fromEntries(files.map((f) => [f.name, f.bytes])), {
		level: ext === "png" ? 0 : 6,
	});
	downloadBlob(
		new Blob([zip.slice()], { type: "application/zip" }),
		`cutline-${ext}.zip`,
	);
}
