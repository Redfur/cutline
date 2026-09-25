// Растеризация SVG в PNG через offscreen canvas. Порт rasterize() из прототипа —
// но без принудительной заливки белым: прототип всегда рисовал непрозрачную
// карточку, а наша модель умеет canvas.background: "transparent", и растр должен
// это уважать (фон уже нарисован внутри самого SVG, если он не прозрачный).
import { downloadBlob } from "./download";

const MM_PER_INCH = 25.4;

function pxPerMm(dpi: number): number {
	return dpi / MM_PER_INCH;
}

export function rasterizeSvgToPng(
	svg: string,
	widthMm: number,
	heightMm: number,
	dpi: number,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const scale = pxPerMm(dpi);
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = Math.round(widthMm * scale);
			canvas.height = Math.round(heightMm * scale);
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("2D canvas недоступен — растеризация невозможна"));
				return;
			}
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			canvas.toBlob((blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error("Не удалось собрать PNG"));
				}
			}, "image/png");
		};
		img.onerror = () => reject(new Error("Не удалось растрировать SVG"));
		img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
	});
}

export async function downloadPng(
	svg: string,
	widthMm: number,
	heightMm: number,
	dpi: number,
	filename: string,
): Promise<void> {
	const blob = await rasterizeSvgToPng(svg, widthMm, heightMm, dpi);
	downloadBlob(blob, filename);
}
