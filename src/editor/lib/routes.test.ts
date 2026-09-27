import { describe, expect, it } from "vitest";
import { docPath, NEW_PATH, parseRoute } from "./routes";

describe("маршруты", () => {
	it("документ в режимах «Дизайн» и «Данные»", () => {
		expect(parseRoute("/doc/abc")).toEqual({
			kind: "doc",
			id: "abc",
			mode: "design",
		});
		expect(parseRoute("/doc/abc/data")).toEqual({
			kind: "doc",
			id: "abc",
			mode: "data",
		});
	});

	it("docPath и parseRoute — туда и обратно", () => {
		for (const mode of ["design", "data"] as const) {
			expect(parseRoute(docPath("a b/c", mode))).toEqual({
				kind: "doc",
				id: "a b/c",
				mode,
			});
		}
	});

	it("стартовый экран", () => {
		expect(parseRoute(NEW_PATH)).toEqual({ kind: "new" });
	});

	it("корень и незнакомое — к последнему документу", () => {
		for (const path of ["/", "", "/doc", "/doc/abc/x", "/new/x", "/что-то"]) {
			expect(parseRoute(path)).toEqual({ kind: "root" });
		}
	});
});
