// Маршруты приложения — в hash (#/doc/…): у GitHub Pages нет SPA-fallback, а сайт
// живёт в подкаталоге /cutline/. Путь читает и меняет wouter (useHashLocation в
// Workspace), разбор — здесь, без React: так он проверяется тестом.
import type { ViewState } from "../../storage/documents";

export type EditorMode = ViewState["mode"];

export type Route =
	// корень и всё незнакомое — открыть последний документ
	| { kind: "root" }
	// стартовый экран: выбор шаблона
	| { kind: "new" }
	| { kind: "doc"; id: string; mode: EditorMode };

export const NEW_PATH = "/new";

export function docPath(id: string, mode: EditorMode = "design"): string {
	const base = `/doc/${encodeURIComponent(id)}`;
	return mode === "data" ? `${base}/data` : base;
}

export function parseRoute(path: string): Route {
	const parts = path.split("/").filter(Boolean);
	if (parts.length === 1 && parts[0] === "new") return { kind: "new" };
	if (parts[0] === "doc" && parts[1]) {
		if (parts.length === 2) {
			return { kind: "doc", id: decodeURIComponent(parts[1]), mode: "design" };
		}
		if (parts.length === 3 && parts[2] === "data") {
			return { kind: "doc", id: decodeURIComponent(parts[1]), mode: "data" };
		}
	}
	return { kind: "root" };
}
