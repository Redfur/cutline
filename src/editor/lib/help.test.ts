import { describe, expect, it } from "vitest";
import { helpUrl } from "./help";

describe("helpUrl", () => {
	it("от base сборки — работает в подкаталоге Pages", () => {
		expect(helpUrl(undefined, "/")).toBe("/help.html");
		expect(helpUrl("functions", "/cutline/")).toBe(
			"/cutline/help.html#functions",
		);
	});
});
