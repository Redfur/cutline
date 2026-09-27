// Плейсхолдеры {{…}} в content текста и src изображения (docs/document-model.md).
// Чистые функции без DOM: ими пользуются и render(), и проверка проблем, и правки
// колонок — один разбор шаблона на весь проект, чтобы они не разошлись в том,
// что считать плейсхолдером.
//
// Внутри скобок — ключ поля ({{ФИО}}) или вызов встроенной функции
// ({{ pad(n(), 3) }}, functions.ts). Вызов — только если имя латиницей и сразу за ним
// скобка: кириллический ключ вроде «Дата и место» вызовом не станет никогда.
import type {
	CutlineDocument,
	CutlineElement,
	DataRecord,
	FieldDef,
} from "../model/document";
import {
	FUNCTION_NAMES,
	FUNCTIONS,
	FunctionError,
	isFunctionName,
} from "./functions";

// Ключ — всё, кроме фигурных скобок: колонка CSV «ФИО» становится ключом как есть.
// \w в JS без флага u — только латиница, и {{ФИО}} молча не подставлялся бы.
// Пробелы по краям внутри скобок прощаем: {{ name }} пишут руками.
const PLACEHOLDER_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

// Скобка сразу за латинским именем, без пробела: «size (cm)» остаётся ключом, а
// незакрытое «pad(id, 3» — ошибкой, а не ключом, который молча даст пустоту
const CALL_START = /^[A-Za-z_][A-Za-z0-9_]*\(/;

export type Expr =
	| { kind: "key"; key: string }
	| { kind: "literal"; value: string }
	| { kind: "call"; name: string; args: Expr[] };

// Разобранное содержимое одних скобок: выражение или ошибка разбора
export type Parsed =
	| { expr: Expr; error: null }
	| { expr: null; error: string };

class ParseError extends Error {}

// Рекурсивный спуск по строке внутри скобок. Ключ в аргументе — всё до «,» или «)»,
// с пробелами и кириллицей; строка — в "…" или «…»; число — как есть.
function parseCall(source: string): Expr {
	let pos = 0;
	const skipSpaces = () => {
		while (pos < source.length && /\s/.test(source[pos])) pos++;
	};
	const parseExpr = (): Expr => {
		skipSpaces();
		const rest = source.slice(pos);
		const quote = rest[0];
		if (quote === '"' || quote === "«") {
			const close = quote === '"' ? '"' : "»";
			const end = source.indexOf(close, pos + 1);
			if (end < 0) throw new ParseError(`не закрыта кавычка ${quote}`);
			const value = source.slice(pos + 1, end);
			pos = end + 1;
			return { kind: "literal", value };
		}
		const call = /^([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec(rest);
		if (call) {
			const name = call[1];
			if (!isFunctionName(name)) {
				throw new ParseError(
					`нет функции ${name}() — есть: ${FUNCTION_NAMES.join(", ")}`,
				);
			}
			pos += call[0].length;
			const args: Expr[] = [];
			skipSpaces();
			if (source[pos] === ")") {
				pos++;
			} else {
				for (;;) {
					args.push(parseExpr());
					skipSpaces();
					if (source[pos] === ",") {
						pos++;
						continue;
					}
					if (source[pos] === ")") {
						pos++;
						break;
					}
					throw new ParseError(`${name}(): не закрыта скобка`);
				}
			}
			const fn = FUNCTIONS[name];
			if (args.length < fn.minArgs || args.length > fn.maxArgs) {
				const expected =
					fn.minArgs === fn.maxArgs
						? String(fn.minArgs)
						: `от ${fn.minArgs} до ${fn.maxArgs}`;
				throw new ParseError(
					`${name}(): аргументов ${args.length}, нужно ${expected}`,
				);
			}
			return { kind: "call", name, args };
		}
		const number = /^-?\d+(?:[.,]\d+)?(?=\s*[,)])/.exec(rest);
		if (number) {
			pos += number[0].length;
			return { kind: "literal", value: number[0] };
		}
		let end = pos;
		while (end < source.length && source[end] !== "," && source[end] !== ")") {
			end++;
		}
		const key = source.slice(pos, end).trim();
		if (!key) throw new ParseError("пустой аргумент");
		pos = end;
		return { kind: "key", key };
	};
	const expr = parseExpr();
	skipSpaces();
	if (pos < source.length) {
		throw new ParseError(`лишнее после скобки: «${source.slice(pos)}»`);
	}
	return expr;
}

export function parsePlaceholder(inner: string): Parsed {
	const source = inner.trim();
	if (!CALL_START.test(source)) {
		return { expr: { kind: "key", key: source }, error: null };
	}
	try {
		return { expr: parseCall(source), error: null };
	} catch (err) {
		if (err instanceof ParseError) return { expr: null, error: err.message };
		throw err;
	}
}

interface Match {
	start: number;
	end: number;
	raw: string;
	parsed: Parsed;
}

function matches(template: string): Match[] {
	return Array.from(template.matchAll(PLACEHOLDER_RE), (m) => ({
		start: m.index,
		end: m.index + m[0].length,
		raw: m[0],
		parsed: parsePlaceholder(m[1] ?? ""),
	}));
}

// Данные для вычисления: запись и её номер (n()). Номер обязателен: забытый номер
// молча давал бы «1» на всех карточках тиража
export interface Scope {
	record: DataRecord;
	n: number;
}

export interface PlaceholderError {
	message: string;
	// поля из аргументов упавшего вызова — их ячейки подсвечиваются в «Данных»
	keys: string[];
	// не зависит от записи (разбор, qr в тексте) — показывается в инспекторе, а не
	// как проблема каждой записи тиража
	static: boolean;
}

export interface Evaluated {
	text: string;
	errors: PlaceholderError[];
}

function keysOf(expr: Expr, out: string[] = []): string[] {
	if (expr.kind === "key") out.push(expr.key);
	if (expr.kind === "call") for (const a of expr.args) keysOf(a, out);
	return out;
}

function evalExpr(
	expr: Expr,
	scope: Scope,
	errors: PlaceholderError[],
): string {
	switch (expr.kind) {
		case "key":
			return scope.record[expr.key] ?? "";
		case "literal":
			return expr.value;
		case "call": {
			const fn = FUNCTIONS[expr.name];
			if (!fn.call) {
				errors.push({
					message: `${expr.name}() — только в источнике картинки, целиком`,
					keys: [],
					static: true,
				});
				return "";
			}
			const args = expr.args.map((a) => evalExpr(a, scope, errors));
			try {
				return fn.call(args, { n: scope.n });
			} catch (err) {
				if (!(err instanceof FunctionError)) throw err;
				errors.push({
					message: err.message,
					keys: keysOf(expr),
					static: false,
				});
				return "";
			}
		}
	}
}

export function evaluate(template: string, scope: Scope): Evaluated {
	const errors: PlaceholderError[] = [];
	const text = template.replace(PLACEHOLDER_RE, (_match, inner: string) => {
		const parsed = parsePlaceholder(inner);
		if (!parsed.expr) {
			errors.push({ message: parsed.error, keys: [], static: true });
			return "";
		}
		return evalExpr(parsed.expr, scope, errors);
	});
	return { text, errors };
}

export function substitute(template: string, scope: Scope): string {
	return evaluate(template, scope).text;
}

export type ImageSource =
	| { kind: "none" }
	| { kind: "href"; href: string }
	| { kind: "qr"; text: string };

// Источник картинки: ссылка (возможно, собранная из полей) или QR-код. qr() — только
// весь src целиком: «https://{{ qr(…) }}» не имеет смысла, и это ошибка, а не пустота
export function imageSource(
	src: string,
	scope: Scope,
): { source: ImageSource; errors: PlaceholderError[] } {
	const found = matches(src);
	const only = found.length === 1 ? found[0] : null;
	if (
		only &&
		only.raw === src.trim() &&
		only.parsed.expr?.kind === "call" &&
		only.parsed.expr.name === "qr"
	) {
		const errors: PlaceholderError[] = [];
		const text = only.parsed.expr.args
			.map((a) => evalExpr(a, scope, errors))
			.join("");
		return {
			source: text ? { kind: "qr", text } : { kind: "none" },
			errors,
		};
	}
	const { text, errors } = evaluate(src, scope);
	const href = text.trim();
	return { source: href ? { kind: "href", href } : { kind: "none" }, errors };
}

// Ошибки шаблона, не зависящие от записи, — для инспектора
export function templateErrors(template: string): string[] {
	const probe = evaluate(template, { record: {}, n: 1 });
	return probe.errors.filter((e) => e.static).map((e) => e.message);
}

export function imageSourceErrors(src: string): string[] {
	return imageSource(src, { record: {}, n: 1 })
		.errors.filter((e) => e.static)
		.map((e) => e.message);
}

// Ключи полей шаблона, в том числе из аргументов функций
export function placeholderKeys(template: string): string[] {
	return matches(template).flatMap((m) =>
		m.parsed.expr ? keysOf(m.parsed.expr) : [],
	);
}

// Ключи, пустое значение которых — проблема записи. Первый аргумент default() — нет:
// запасной текст для пустой ячейки и есть смысл default
function requiredKeysOf(expr: Expr, out: string[]): void {
	if (expr.kind === "key") out.push(expr.key);
	if (expr.kind !== "call") return;
	expr.args.forEach((a, i) => {
		if (!(expr.name === "default" && i === 0)) requiredKeysOf(a, out);
	});
}

export function requiredKeys(template: string): string[] {
	const out: string[] = [];
	for (const m of matches(template)) {
		if (m.parsed.expr) requiredKeysOf(m.parsed.expr, out);
	}
	return out;
}

function quote(value: string): string {
	return value.includes('"') ? `«${value}»` : `"${value}"`;
}

function serialize(expr: Expr): string {
	switch (expr.kind) {
		case "key":
			return expr.key;
		case "literal":
			return /^-?\d+(?:[.,]\d+)?$/.test(expr.value)
				? expr.value
				: quote(expr.value);
		case "call":
			return `${expr.name}(${expr.args.map(serialize).join(", ")})`;
	}
}

function renameIn(expr: Expr, oldKey: string, newKey: string): Expr {
	if (expr.kind === "key" && expr.key === oldKey) {
		return { kind: "key", key: newKey };
	}
	if (expr.kind === "call") {
		return { ...expr, args: expr.args.map((a) => renameIn(a, oldKey, newKey)) };
	}
	return expr;
}

export function renamePlaceholder(
	template: string,
	oldKey: string,
	newKey: string,
): string {
	return template.replace(PLACEHOLDER_RE, (match, inner: string) => {
		const { expr } = parsePlaceholder(inner);
		if (!expr || !keysOf(expr).includes(oldKey)) return match;
		if (expr.kind === "key") return `{{${newKey}}}`;
		// вызов пишем заново: так проще, чем править исходник по позициям, а
		// разбор того, что мы напишем, даст то же выражение
		return `{{ ${serialize(renameIn(expr, oldKey, newKey))} }}`;
	});
}

// Строка элемента, в которую подставляются данные: у текста content, у картинки src.
export function templateOf(el: CutlineElement): string | null {
	if (el.type === "text") return el.content;
	if (el.type === "image") return el.src;
	return null;
}

function fieldsMap(
	doc: CutlineDocument,
	keysOfTemplate: (template: string) => string[],
): Map<string, string[]> {
	const used = new Map<string, string[]>();
	for (const el of doc.elements) {
		if (!el.visible) continue;
		const template = templateOf(el);
		if (template === null) continue;
		for (const key of keysOfTemplate(template)) {
			const ids = used.get(key) ?? [];
			if (!ids.includes(el.id)) ids.push(el.id);
			used.set(key, ids);
		}
	}
	return used;
}

// key → id элементов, где он используется. Скрытые элементы не считаются: на
// печать они не попадают, и пустое поле в них — не проблема карточки.
export function usedFields(doc: CutlineDocument): Map<string, string[]> {
	return fieldsMap(doc, placeholderKeys);
}

// То же, но без полей, пустота которых предусмотрена (default)
export function requiredFields(doc: CutlineDocument): Map<string, string[]> {
	return fieldsMap(doc, requiredKeys);
}

// Запись для предпросмотра, пока настоящих записей нет: макет с {{name}} на пустом
// документе показывал бы пустоту, а не то, как карточка будет выглядеть.
export function sampleRecord(fields: FieldDef[]): DataRecord {
	return Object.fromEntries(fields.map((f) => [f.key, f.sample]));
}

// Ключ, пригодный для {{…}}: без скобок и без пробелов по краям. Пустая строка —
// «ключ не годится», решает вызывающий код.
export function normalizeKey(raw: string): string {
	return raw.replace(/[{}]/g, "").trim();
}
