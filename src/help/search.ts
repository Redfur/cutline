// Поиск в панели справки: по заголовкам и тексту, без учёта регистра. Раздел,
// в заголовке которого есть запрос, показывается целиком — «экспорт» должен найти
// весь раздел, а не только пункты, где слово случайно встретилось
import type { HelpSection } from "./content";

// ё и е — одно: «объем» должен находить «объём»
function normalize(text: string): string {
	return text.toLocaleLowerCase("ru").replaceAll("ё", "е");
}

export function filterSections(
	sections: HelpSection[],
	query: string,
): HelpSection[] {
	const q = normalize(query.trim());
	if (!q) return sections;
	const hits = (...texts: (string | undefined)[]) =>
		texts.some((t) => t !== undefined && normalize(t).includes(q));
	return sections.flatMap((s) => {
		if (hits(s.title)) return [s];
		const items = s.items?.filter((i) => hits(i.title, i.text, i.example));
		const keys = s.keys?.filter((k) => hits(k.action, k.keys));
		if (!items?.length && !keys?.length) return [];
		return [{ ...s, intro: undefined, items, keys }];
	});
}
