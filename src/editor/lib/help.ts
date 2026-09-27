// Справка — отдельная страница help.html рядом с редактором (src/help/). Путь — от
// BASE_URL, а не «/help.html»: на GitHub Pages сайт живёт в подкаталоге /cutline/
export function helpUrl(
	anchor?: string,
	base: string = import.meta.env.BASE_URL,
): string {
	return `${base}help.html${anchor ? `#${anchor}` : ""}`;
}

// в новой вкладке: редактор остаётся открытым там, где был
export function openHelp(anchor?: string): void {
	window.open(helpUrl(anchor), "_blank", "noopener");
}
