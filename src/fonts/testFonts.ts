// Только для тестов (node): встроенные шрифты без fetch. ?inline — data URI, поэтому
// не нужны fs и типы node в src/. В сборку приложения не попадает: его никто не импортирует.
import { type Font, parse } from "opentype.js";

const FILES = import.meta.glob<string>("./files/*.ttf", {
	query: "?inline",
	import: "default",
	eager: true,
});

export const TEST_FONT_FILES = Object.keys(FILES).map(
	(path) => path.split("/").pop() ?? "",
);

export function loadTestFont(file: string): Font {
	const dataUri = FILES[`./files/${file}`];
	if (!dataUri) throw new Error(`нет файла шрифта ${file}`);
	const bytes = Uint8Array.from(atob(dataUri.split(",")[1]), (c) =>
		c.charCodeAt(0),
	);
	return parse(bytes.buffer);
}
