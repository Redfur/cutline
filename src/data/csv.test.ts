import { describe, expect, it } from "vitest";
import {
	autoMapping,
	decodeCsv,
	detectDelimiter,
	looksMisdecoded,
	NEW_FIELD,
	parseCsv,
	serializeCsv,
	toTable,
} from "./csv";

describe("detectDelimiter", () => {
	it("по первой строке", () => {
		expect(detectDelimiter("a;b;c\n1,2;3")).toBe(";");
		expect(detectDelimiter("a,b,c")).toBe(",");
		expect(detectDelimiter("a\tb")).toBe("\t");
	});

	it("не считает разделители в кавычках", () => {
		expect(detectDelimiter('"Иванов, Иван, мл.";Отдел')).toBe(";");
	});

	it("одна колонка — запятая по умолчанию", () => {
		expect(detectDelimiter("Имя\nАнна")).toBe(",");
	});
});

describe("parseCsv", () => {
	it("простые строки и все виды переводов строк", () => {
		expect(parseCsv("a;b\r\n1;2\n3;4\r5;6", ";")).toEqual([
			["a", "b"],
			["1", "2"],
			["3", "4"],
			["5", "6"],
		]);
	});

	it("кавычки: разделитель, перевод строки и экранированная кавычка", () => {
		expect(parseCsv('"a;b","line\nbreak","say ""hi"""\n', ",")).toEqual([
			["a;b", "line\nbreak", 'say "hi"'],
		]);
	});

	it("пустые ячейки и завершающий перевод строки", () => {
		expect(parseCsv("a,,c\n,,\n", ",")).toEqual([
			["a", "", "c"],
			["", "", ""],
		]);
	});
});

describe("toTable", () => {
	it("заголовок, выравнивание длины строк, пропуск пустых", () => {
		const table = toTable(
			[[" Имя ", "Город"], ["Анна"], ["", " "], ["Олег", "Томск", "лишнее"]],
			true,
		);
		expect(table).toEqual({
			header: ["Имя", "Город", ""],
			rows: [
				["Анна", "", ""],
				["Олег", "Томск", "лишнее"],
			],
			skipped: [3],
			columnCount: 3,
		});
	});

	it("без заголовка первая строка — данные", () => {
		expect(toTable([["a"], ["b"]], false).rows).toEqual([["a"], ["b"]]);
	});
});

describe("autoMapping", () => {
	const fields = [
		{ key: "name", label: "Имя", sample: "" },
		{ key: "dept", label: "Отдел", sample: "" },
	];

	it("по названию или ключу без учёта регистра, остальное — новыми полями", () => {
		const table = toTable([["имя", "DEPT", "Email"]], true);
		expect(autoMapping(table, fields)).toEqual(["name", "dept", NEW_FIELD]);
	});

	it("одно поле не сопоставляется двум колонкам", () => {
		const table = toTable([["Имя", "Имя"]], true);
		expect(autoMapping(table, fields)).toEqual(["name", NEW_FIELD]);
	});
});

describe("кодировка", () => {
	it("1251, прочитанный как UTF-8, распознаётся", () => {
		// «Имя» в Windows-1251
		const cp1251 = new Uint8Array([0xc8, 0xec, 0xff]);
		expect(looksMisdecoded(decodeCsv(cp1251, "utf-8"))).toBe(true);
		expect(decodeCsv(cp1251, "windows-1251")).toBe("Имя");
	});

	it("UTF-8 с BOM — BOM срезан", () => {
		const bytes = new TextEncoder().encode("﻿Имя");
		expect(decodeCsv(bytes, "utf-8")).toBe("Имя");
	});
});

describe("serializeCsv", () => {
	it("заголовки — названия, экранирование, круговой обмен", () => {
		const fields = [
			{ key: "name", label: "Имя", sample: "" },
			{ key: "note", label: "Заметка", sample: "" },
		];
		const records = [
			{ name: "Анна", note: 'Сказала "да"; ушла' },
			{ name: "Олег", note: "две\nстроки" },
		];
		const csv = serializeCsv(fields, records);
		expect(csv.split("\r\n")[0]).toBe("Имя;Заметка");
		const table = toTable(parseCsv(csv, detectDelimiter(csv)), true);
		expect(autoMapping(table, fields)).toEqual(["name", "note"]);
		expect(table.rows).toEqual([
			["Анна", 'Сказала "да"; ушла'],
			["Олег", "две\nстроки"],
		]);
	});
});
