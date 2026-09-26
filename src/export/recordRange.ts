// Диапазон записей из поля «Записи → Диапазон»: «1-5, 8, 10–12». Номера — как в
// таблице, с 1; на выходе индексы с 0.

export type RecordRange =
	| { ok: true; indices: number[] }
	| { ok: false; error: string };

export function parseRecordRange(text: string, total: number): RecordRange {
	// «1 - 5» → «1-5»: пробелы вокруг тире не разделяют номера
	const parts = text
		.replace(/\s*([-–—])\s*/g, "$1")
		.split(/[,;\s]+/)
		.filter(Boolean);
	if (!parts.length) {
		return { ok: false, error: "Укажите номера записей, например 1–5, 8" };
	}
	const seen = new Set<number>();
	const indices: number[] = [];
	for (const part of parts) {
		// дефис, минус и оба тире — в Word и macOS «1-5» само становится «1–5»
		const match = /^(\d+)(?:[-–—](\d+))?$/.exec(part);
		if (!match) {
			return {
				ok: false,
				error: `Не понял «${part}» — нужны номера и диапазоны: 1–5, 8`,
			};
		}
		const from = Number(match[1]);
		const to = match[2] === undefined ? from : Number(match[2]);
		if (from < 1 || to < 1 || from > total || to > total) {
			return {
				ok: false,
				error: `Записи ${match[2] === undefined ? from : `${from}–${to}`} нет — всего ${total}`,
			};
		}
		const step = from <= to ? 1 : -1;
		for (let n = from; n !== to + step; n += step) {
			if (!seen.has(n)) {
				seen.add(n);
				indices.push(n - 1);
			}
		}
	}
	return { ok: true, indices };
}
