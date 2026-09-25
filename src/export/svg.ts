import { downloadBlob } from "./download";

export function downloadSvg(svg: string, filename: string): void {
	downloadBlob(new Blob([svg], { type: "image/svg+xml" }), filename);
}
