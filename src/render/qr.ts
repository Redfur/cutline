// QR-код из {{ qr(…) }} — вектором, одним <path>: в SVG и PDF он остаётся чётким на
// любом увеличении, а растровая картинка в PDF расплылась бы на ризографе. Путь —
// только абсолютные M/L/C/Z: другого svgToPdfOps не разбирает, скругления и круги —
// кубическими кривыми.
//
// Три угловых квадрата («глаза») рисуются отдельно от модулей: по ним сканер находит
// код, и у них своя форма (QrStyle.eyes). Дырка в кольце — внутренний контур в
// обратную сторону: SVG и PDF (fill() в pdf.ts) заливают по nonzero.
import { encode, QrCodeDataType } from "uqr";
import type { QrStyle } from "../model/document";

interface Matrix {
	size: number;
	data: boolean[][];
	// данные или служебный узор (синхрополосы, выравнивающий квадрат, формат)
	types: QrCodeDataType[][];
}

// Матрица зависит только от текста — считаем один раз: сетка миниатюр перерисовывает
// все карточки на каждую правку документа
const cache = new Map<string, Matrix>();
const CACHE_LIMIT = 2000;

function matrixOf(text: string): Matrix {
	const hit = cache.get(text);
	if (hit) return hit;
	// M — 15% на восстановление: запас на царапину и загнутый угол бейджа, а код
	// ещё не слишком мелкий для ссылок в сотню знаков. Поля вокруг нет: рамка
	// элемента и есть код, светлое поле оставляет макет
	const { size, data, types } = encode(text, { ecc: "M", border: 0 });
	if (cache.size >= CACHE_LIMIT) cache.clear();
	const result = { size, data, types };
	cache.set(text, result);
	return result;
}

const EYE = 7;

function isEye(row: number, col: number, size: number): boolean {
	const top = row < EYE;
	const left = col < EYE;
	return (
		(top && left) || (top && col >= size - EYE) || (row >= size - EYE && left)
	);
}

const round = (v: number) => Number(v.toFixed(3));
// доля радиуса для контрольных точек: четыре кубические кривые почти неотличимы от круга
const K = 0.5523;

// Прямоугольник со скруглёнными углами (r = 0 — прямые углы, r = w/2 — круг).
// reverse — против часовой: так контур становится дыркой во внешнем
function roundedRect(
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
	reverse = false,
): string {
	const x1 = x + w;
	const y1 = y + h;
	const p = (px: number, py: number) => `${round(px)} ${round(py)}`;
	if (r <= 0) {
		return reverse
			? `M${p(x, y)}L${p(x, y1)}L${p(x1, y1)}L${p(x1, y)}Z`
			: `M${p(x, y)}L${p(x1, y)}L${p(x1, y1)}L${p(x, y1)}Z`;
	}
	const c = r * K;
	if (reverse) {
		return (
			`M${p(x + r, y)}` +
			`C${p(x + r - c, y)} ${p(x, y + r - c)} ${p(x, y + r)}` +
			`L${p(x, y1 - r)}` +
			`C${p(x, y1 - r + c)} ${p(x + r - c, y1)} ${p(x + r, y1)}` +
			`L${p(x1 - r, y1)}` +
			`C${p(x1 - r + c, y1)} ${p(x1, y1 - r + c)} ${p(x1, y1 - r)}` +
			`L${p(x1, y + r)}` +
			`C${p(x1, y + r - c)} ${p(x1 - r + c, y)} ${p(x1 - r, y)}Z`
		);
	}
	return (
		`M${p(x + r, y)}` +
		`L${p(x1 - r, y)}` +
		`C${p(x1 - r + c, y)} ${p(x1, y + r - c)} ${p(x1, y + r)}` +
		`L${p(x1, y1 - r)}` +
		`C${p(x1, y1 - r + c)} ${p(x1 - r + c, y1)} ${p(x1 - r, y1)}` +
		`L${p(x + r, y1)}` +
		`C${p(x + r - c, y1)} ${p(x, y1 - r + c)} ${p(x, y1 - r)}` +
		`L${p(x, y + r)}` +
		`C${p(x, y + r - c)} ${p(x + r - c, y)} ${p(x + r, y)}Z`
	);
}

// Радиусы «глаз» в модулях: кольцо 7×7 с дыркой 5×5 и центр 3×3
const EYE_RADII: Record<QrStyle["eyes"], [number, number, number]> = {
	square: [0, 0, 0],
	rounded: [2.2, 1.5, 0.9],
	circle: [3.5, 2.5, 1.5],
};

function eyePath(
	ex: number,
	ey: number,
	m: number,
	shape: QrStyle["eyes"],
): string {
	const [outer, hole, center] = EYE_RADII[shape];
	return (
		roundedRect(ex, ey, 7 * m, 7 * m, outer * m) +
		roundedRect(ex + m, ey + m, 5 * m, 5 * m, hole * m, true) +
		roundedRect(ex + 2 * m, ey + 2 * m, 3 * m, 3 * m, center * m)
	);
}

function modulesPath(
	matrix: Matrix,
	x: number,
	y: number,
	m: number,
	shape: QrStyle["modules"],
): string {
	const { size, data, types } = matrix;
	// Формой рисуются только модули данных. Служебные узоры остаются квадратами:
	// точками сканер теряет выравнивающий квадрат и синхрополосы — проверено
	// декодером: точки 0,85 модуля читались в 5 случаях из 18, со сплошными
	// служебными узорами — во всех на размерах, какими код видит камера
	const shaped = (r: number, c: number) =>
		shape !== "square" && types[r][c] === QrCodeDataType.Data;
	const parts: string[] = [];
	data.forEach((row, r) => {
		// подряд идущие тёмные квадратные модули ряда — одним прямоугольником:
		// путь короче вдвое
		let start = -1;
		for (let c = 0; c <= size; c++) {
			const dark = c < size && row[c] && !isEye(r, c, size) && !shaped(r, c);
			if (dark && start < 0) start = c;
			if (!dark && start >= 0) {
				parts.push(
					roundedRect(x + start * m, y + r * m, (c - start) * m, m, 0),
				);
				start = -1;
			}
		}
		row.forEach((dark, c) => {
			if (!dark || !shaped(r, c)) return;
			if (shape === "rounded") {
				parts.push(roundedRect(x + c * m, y + r * m, m, m, 0.35 * m));
			} else {
				// точка чуть меньше модуля: соседние не сливаются в «гусеницу»
				const d = 0.85 * m;
				const inset = (m - d) / 2;
				parts.push(
					roundedRect(x + c * m + inset, y + r * m + inset, d, d, d / 2),
				);
			}
		});
	});
	return parts.join("");
}

// Квадрат со стороной side с левым верхним углом в (x, y), мм
export function qrPathData(
	text: string,
	x: number,
	y: number,
	side: number,
	style: Pick<QrStyle, "modules" | "eyes">,
): string {
	const matrix = matrixOf(text);
	const m = side / matrix.size;
	const far = (matrix.size - EYE) * m;
	return (
		modulesPath(matrix, x, y, m, style.modules) +
		eyePath(x, y, m, style.eyes) +
		eyePath(x + far, y, m, style.eyes) +
		eyePath(x, y + far, m, style.eyes)
	);
}

// Для проблем записи и тестов: сколько модулей в стороне у кода этого текста
// (бросает, если текст в QR не влезает)
export function qrModules(text: string): number {
	return matrixOf(text).size;
}
