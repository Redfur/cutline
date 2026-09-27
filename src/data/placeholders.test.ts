import { describe, expect, it } from "vitest";
import type {
	CutlineDocument,
	CutlineElement,
	DataRecord,
} from "../model/document";
import { blankDocument } from "../render/fixtures/blank";
import {
	evaluate,
	imageSource,
	normalizeKey,
	parsePlaceholder,
	placeholderKeys,
	renamePlaceholder,
	requiredKeys,
	sampleRecord,
	substitute,
	templateErrors,
	usedFields,
} from "./placeholders";

const at = (record: DataRecord) => ({ record, n: 1 });

describe("substitute", () => {
	it("подставляет несколько ключей, неизвестный — пустой строкой", () => {
		expect(
			substitute(
				"{{city}}, {{country}}{{nope}}",
				at({
					city: "Казань",
					country: "Россия",
				}),
			),
		).toBe("Казань, Россия");
	});

	it("кириллица и пробелы внутри скобок", () => {
		expect(substitute("{{ ФИО }}", at({ ФИО: "Анна" }))).toBe("Анна");
	});
});

describe("placeholderKeys / renamePlaceholder", () => {
	it("находит все ключи", () => {
		expect(placeholderKeys("ID: {{badgeId}} / {{ name }}")).toEqual([
			"badgeId",
			"name",
		]);
	});

	it("переименовывает только совпадающий ключ", () => {
		expect(
			renamePlaceholder("{{name}} {{nick}} {{ name }}", "name", "fio"),
		).toBe("{{fio}} {{nick}} {{fio}}");
	});
});

describe("usedFields", () => {
	const base = {
		name: "",
		x: 0,
		y: 0,
		w: 1,
		h: 1,
		rotation: 0,
		locked: false,
	};
	const elements: CutlineElement[] = [
		{
			...base,
			id: "a",
			type: "image",
			visible: true,
			src: "{{photo}}",
			fit: "cover",
			background: null,
		},
		{
			...base,
			id: "b",
			type: "rect",
			visible: true,
			fill: null,
			stroke: null,
			strokeWidth: 0,
			radius: 0,
		},
		{
			...base,
			id: "c",
			type: "image",
			visible: false,
			src: "{{hidden}}",
			fit: "cover",
			background: null,
		},
	];
	const doc: CutlineDocument = { ...blankDocument, elements };

	it("собирает ключи из видимых текстов и картинок", () => {
		expect([...usedFields(doc).entries()]).toEqual([["photo", ["a"]]]);
	});
});

describe("sampleRecord / normalizeKey", () => {
	it("запись из примеров полей", () => {
		expect(
			sampleRecord([{ key: "name", label: "Имя", sample: "Имя Фамилия" }]),
		).toEqual({ name: "Имя Фамилия" });
	});

	it("убирает скобки и пробелы по краям", () => {
		expect(normalizeKey(" {{Имя}} ")).toBe("Имя");
	});
});

describe("выражения в плейсхолдерах", () => {
	const scope = (record: DataRecord, n = 1) => ({ record, n });

	it("вызов с вложенным вызовом, числом и строкой", () => {
		expect(parsePlaceholder('pad(n(), 3, "0")')).toEqual({
			expr: {
				kind: "call",
				name: "pad",
				args: [
					{ kind: "call", name: "n", args: [] },
					{ kind: "literal", value: "3" },
					{ kind: "literal", value: "0" },
				],
			},
			error: null,
		});
	});

	it("кириллический ключ со скобками — ключ, а не вызов", () => {
		expect(parsePlaceholder("Цена (руб)")).toEqual({
			expr: { kind: "key", key: "Цена (руб)" },
			error: null,
		});
	});

	it("ключ с пробелами в аргументе", () => {
		expect(
			substitute(
				"{{ upper(Дата и место) }}",
				scope({ "Дата и место": "казань" }),
			),
		).toBe("КАЗАНЬ");
	});

	it("n() и pad — номер записи с нулями", () => {
		expect(substitute("№ {{ pad(n(), 3) }}", scope({}, 7))).toBe("№ 007");
	});

	it("строка в ёлочках может содержать кавычки", () => {
		expect(
			substitute('{{ default(role, «Гость "VIP"») }}', scope({ role: "" })),
		).toBe('Гость "VIP"');
	});

	it("ошибки шаблона — понятным текстом", () => {
		expect(templateErrors("{{ qrcode(link) }}")).toEqual([
			"нет функции qrcode() — есть: qr, pad, n, default, upper, lower, capitalize, num",
		]);
		expect(templateErrors("{{ pad(id) }}")).toEqual([
			"pad(): аргументов 1, нужно от 2 до 3",
		]);
		expect(templateErrors("{{ pad(id, 3 }}")).toEqual([
			"pad(): не закрыта скобка",
		]);
		expect(templateErrors("{{ qr(link) }}")).toEqual([
			"qr() — только в источнике картинки, целиком",
		]);
		expect(templateErrors("{{ name }} {{ pad(n(), 2) }}")).toEqual([]);
	});

	it("ошибка значения — пустая строка и ключи аргумента", () => {
		const { text, errors } = evaluate(
			"{{ num(price) }} ₽",
			scope({ price: "дорого" }),
		);
		expect(text).toBe(" ₽");
		expect(errors).toEqual([
			{ message: "num(): «дорого» — не число", keys: ["price"], static: false },
		]);
	});

	it("ключи — и из аргументов; обязательные — без первого аргумента default", () => {
		const t = '{{ default(role, "Гость") }} {{ upper(name) }}';
		expect(placeholderKeys(t)).toEqual(["role", "name"]);
		expect(requiredKeys(t)).toEqual(["name"]);
	});

	it("переименование колонки правит и аргументы функций", () => {
		expect(
			renamePlaceholder(
				'{{ default(role, "—") }} {{role}}',
				"role",
				"Должность",
			),
		).toBe('{{ default(Должность, "—") }} {{Должность}}');
	});

	it("источник картинки: ссылка из полей, QR целиком, QR внутри строки — ошибка", () => {
		expect(
			imageSource("https://x.example/{{id}}.png", scope({ id: "7" })).source,
		).toEqual({ kind: "href", href: "https://x.example/7.png" });
		expect(
			imageSource('{{ qr("https://x.example/u/", pad(n(), 3)) }}', scope({}, 5))
				.source,
		).toEqual({ kind: "qr", text: "https://x.example/u/005" });
		expect(imageSource("{{photo}}", scope({ photo: "" })).source).toEqual({
			kind: "none",
		});
		const mixed = imageSource("a{{ qr(link) }}", scope({ link: "x" }));
		expect(mixed.errors.map((e) => e.static)).toEqual([true]);
	});
});
