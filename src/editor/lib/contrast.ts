// Контраст QR-кода с фоном: сканер телефона ищет тёмные модули на светлом, и бледный
// или «негативный» код на карточке выглядит нормально, а не считывается. Считаем по
// WCAG — та же относительная яркость, что у проверки контраста текста.

// #RRGGBB или #RGB; всё остальное (transparent) — null
function rgbOf(color: string): [number, number, number] | null {
	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())?.[1];
	if (!hex) return null;
	const full =
		hex.length === 3
			? hex
					.split("")
					.map((c) => c + c)
					.join("")
			: hex;
	return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16)) as [
		number,
		number,
		number,
	];
}

function luminance([r, g, b]: [number, number, number]): number {
	const lin = (v: number) => {
		const c = v / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// 1…21; прозрачный или непонятный цвет — белая бумага
export function contrastRatio(a: string, b: string): number {
	const la = luminance(rgbOf(a) ?? [255, 255, 255]);
	const lb = luminance(rgbOf(b) ?? [255, 255, 255]);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Ниже — уже заметно хуже читается камерой в плохом свете; чёрный на белом — 21
const MIN_QR_CONTRAST = 4;

export function qrContrastWarning(
	color: string,
	background: string,
): string | null {
	const fg = luminance(rgbOf(color) ?? [0, 0, 0]);
	const bg = luminance(rgbOf(background) ?? [255, 255, 255]);
	if (fg > bg) return "Светлый код на тёмном фоне читают не все сканеры";
	if (contrastRatio(color, background) < MIN_QR_CONTRAST) {
		return "Слабый контраст с фоном — код может не считаться";
	}
	return null;
}
