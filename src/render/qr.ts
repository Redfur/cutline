// QR-код из {{ qr(…) }} — вектором, одним <path>: в SVG и PDF он остаётся чётким на
// любом увеличении, а растровая картинка в PDF расплылась бы на ризографе. Путь —
// только абсолютные M/L/Z: другого svgToPdfOps не разбирает, а новых команд ради
// прямоугольников не нужно.
import { encode } from "uqr";

// Матрица зависит только от текста — считаем один раз: сетка миниатюр перерисовывает
// все карточки на каждую правку документа
interface Runs {
	size: number;
	// [ряд, начало, длина] — подряд идущие тёмные модули ряда одним прямоугольником
	runs: [number, number, number][];
}

const cache = new Map<string, Runs>();
const CACHE_LIMIT = 2000;

function runsOf(text: string): Runs {
	const hit = cache.get(text);
	if (hit) return hit;
	// M — 15% на восстановление: запас на царапину и загнутый угол бейджа, а код
	// ещё не слишком мелкий для ссылок в сотню знаков. Поля вокруг нет: рамка
	// элемента и есть код, светлое поле оставляет макет
	const { size, data } = encode(text, { ecc: "M", border: 0 });
	const runs: Runs["runs"] = [];
	data.forEach((row, y) => {
		let start = -1;
		row.forEach((dark, x) => {
			if (dark && start < 0) start = x;
			if (!dark && start >= 0) {
				runs.push([y, start, x - start]);
				start = -1;
			}
		});
		if (start >= 0) runs.push([y, start, row.length - start]);
	});
	if (cache.size >= CACHE_LIMIT) cache.clear();
	const result = { size, runs };
	cache.set(text, result);
	return result;
}

const round = (v: number) => Number(v.toFixed(3));

// Квадрат со стороной side с левым верхним углом в (x, y), мм
export function qrPathData(
	text: string,
	x: number,
	y: number,
	side: number,
): string {
	const { size, runs } = runsOf(text);
	const m = side / size;
	return runs
		.map(([row, col, len]) => {
			const x0 = round(x + col * m);
			const x1 = round(x + (col + len) * m);
			const y0 = round(y + row * m);
			const y1 = round(y + (row + 1) * m);
			return `M${x0} ${y0}L${x1} ${y0}L${x1} ${y1}L${x0} ${y1}Z`;
		})
		.join("");
}

// Для тестов и подсказок: сколько модулей в стороне у кода этого текста
export function qrModules(text: string): number {
	return runsOf(text).size;
}
