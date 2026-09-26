// Единицы, в которых инспектор показывает типографику. Модель хранит миллиметры (кегль,
// трекинг) и множитель (межстрочный), а пользователь-не-дизайнер знает кегль в пунктах
// по Word, межстрочный и трекинг — в процентах, как в макете дизайн-системы. Перевод
// только здесь, модель и render() про pt и % не знают.

const MM_PER_PT = 25.4 / 72;

// До десятых: в поле «12» после круга туда-обратно, а не «12.000000000000002», и «17»
// вместо «17.01» у кегля по умолчанию в 6 мм. Точнее десятой пункта на печати не видно.
function round1(v: number): number {
	return Math.round(v * 10) / 10;
}

export function mmToPt(mm: number): number {
	return round1(mm / MM_PER_PT);
}

export function ptToMm(pt: number): number {
	return pt * MM_PER_PT;
}

export function lineHeightToPct(lineHeight: number): number {
	return round1(lineHeight * 100);
}

export function pctToLineHeight(pct: number): number {
	return pct / 100;
}

// Трекинг в процентах от кегля: так он не зависит от размера и читается как в макете.
// При нулевом кегле процент не определён — показываем 0, а не NaN в поле.
export function trackingToPct(trackingMm: number, sizeMm: number): number {
	return sizeMm ? round1((trackingMm / sizeMm) * 100) : 0;
}

export function pctToTracking(pct: number, sizeMm: number): number {
	return (pct / 100) * sizeMm;
}
