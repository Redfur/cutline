// Сохранение и загрузка проекта файлом — README прямо требует обходиться без бэкенда.
import type { CutlineDocument } from "../model/document";
import { parseDocument, serializeDocument } from "../model/file";
import { downloadBlob } from "./download";

export function downloadDocument(doc: CutlineDocument, filename: string): void {
	downloadBlob(
		new Blob([serializeDocument(doc)], { type: "application/json" }),
		filename,
	);
}

export async function openDocumentFile(file: File): Promise<CutlineDocument> {
	const text = await file.text();
	return parseDocument(text);
}
