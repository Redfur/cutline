// Русское склонение по числу: 1 запись, 2 записи, 5 записей, 11 записей, 21 запись.
export function plural(n: number, one: string, few: string, many: string) {
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod10 === 1 && mod100 !== 11) return one;
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
	return many;
}

export function records(n: number): string {
	return `${n} ${plural(n, "запись", "записи", "записей")}`;
}
