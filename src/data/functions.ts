// Встроенные функции плейсхолдеров: {{ pad(n(), 3) }}, {{ default(Должность, "Гость") }}.
// Все чистые и детерминированные, без сети: их зовёт render(), а он синхронный и
// одинаковый для экрана, миниатюр и экспорта. Свои функции (чужой JS в документе) —
// не здесь: им нужна песочница и согласие при открытии файла (docs/roadmap.md).
//
// qr() тоже в таблице — ради разбора, числа аргументов и меню, — но у неё нет call:
// её результат не строка, а картинка, и её рисует render() (imageSource в placeholders.ts).

export interface FunctionContext {
	// номер записи с 1 — для n()
	n: number;
}

export interface BuiltinFunction {
	minArgs: number;
	maxArgs: number;
	// для меню «Вставить поле»: что вставить и что это делает. «поле» в заготовке
	// меню заменяет ключом первого поля документа — чтобы вставка сразу работала
	snippet: string;
	hint: string;
	// для справки (src/help/): имя по-человечески, что делает и пример
	// «было → стало». Описания живут здесь, а не в тексте справки, — новая функция
	// попадает в справку сама
	title: string;
	description: string;
	example: string;
	// где имеет смысл: qr — только источник картинки, остальные — текст
	target: "text" | "image";
	// нет — функция не для текста (qr)
	call?: (args: string[], ctx: FunctionContext) => string;
}

// Ошибка значения в конкретной записи: num("абв"), pad(id, "x"). Вызов даёт пустую
// строку, запись получает проблему — а не падает render()
export class FunctionError extends Error {}

// Неразрывный пробел, а не узкий U+202F: узкого нет в Manrope, PT Serif и JetBrains
// Mono, и в кривых PDF он стал бы пустым квадратом
const THOUSANDS = " ";

function toInt(value: string, what: string): number {
	const n = Number(value.trim());
	if (!Number.isInteger(n)) {
		throw new FunctionError(`${what}: «${value}» — не целое число`);
	}
	return n;
}

function formatNumber(value: string): string {
	// пустая ячейка — уже проблема «пусто», вторая «не число» к ней ничего не добавит
	if (!value.trim()) return "";
	const normalized = value.replace(/[\s  ]/g, "").replace(",", ".");
	const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(normalized);
	if (!match) throw new FunctionError(`num(): «${value}» — не число`);
	const [, sign, int, frac] = match;
	const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS);
	return `${sign}${grouped}${frac ? `,${frac}` : ""}`;
}

export const FUNCTIONS: Record<string, BuiltinFunction> = {
	qr: {
		minArgs: 1,
		maxArgs: 10,
		snippet: '{{ qr("https://", поле) }}',
		hint: "QR-код",
		title: "QR-код",
		description:
			"Рисует QR-код из склеенных аргументов: адрес и поле записи. Ставится в источник картинки или инструментом «QR-код».",
		example: 'qr("https://site.ru/u/", id) → код ссылки https://site.ru/u/42',
		target: "image",
	},
	pad: {
		minArgs: 2,
		maxArgs: 3,
		snippet: "{{ pad(n(), 3) }}",
		hint: "Нули: 7 → 007",
		title: "Нули слева",
		description:
			"Дополняет значение до нужной длины нулями или своим символом — для номеров билетов и бейджей.",
		example: "pad(n(), 3) → 007",
		target: "text",
		call: ([value, width, fill = "0"]) => {
			const w = toInt(width, "pad()");
			if (w < 0 || w > 50) {
				throw new FunctionError(`pad(): ширина ${w} — нужна от 0 до 50`);
			}
			if (!fill) throw new FunctionError("pad(): пустой символ заполнения");
			// пустое поле остаётся пустым, а не «000»: иначе пропуск в таблице не заметить
			return value ? value.padStart(w, fill) : "";
		},
	},
	n: {
		minArgs: 0,
		maxArgs: 0,
		snippet: "{{ n() }}",
		hint: "Номер записи",
		title: "Номер записи",
		description: "Порядковый номер записи в таблице, с единицы.",
		example: "n() → 7",
		target: "text",
		call: (_args, ctx) => String(ctx.n),
	},
	default: {
		minArgs: 2,
		maxArgs: 2,
		snippet: '{{ default(поле, "—") }}',
		hint: "Запасное",
		title: "Запасное значение",
		description:
			"Подставляет запасной текст, если ячейка пустая, — запись не считается проблемной.",
		example: 'default(Должность, "Гость") → Гость',
		target: "text",
		call: ([value, fallback]) => (value.trim() ? value : fallback),
	},
	upper: {
		minArgs: 1,
		maxArgs: 1,
		snippet: "{{ upper(поле) }}",
		hint: "ПРОПИСНЫЕ",
		title: "Прописные",
		description: "Переводит текст в прописные буквы.",
		example: "upper(Имя) → АННА",
		target: "text",
		call: ([value]) => value.toLocaleUpperCase("ru"),
	},
	lower: {
		minArgs: 1,
		maxArgs: 1,
		snippet: "{{ lower(поле) }}",
		hint: "строчные",
		title: "Строчные",
		description: "Переводит текст в строчные буквы.",
		example: "lower(Имя) → анна",
		target: "text",
		call: ([value]) => value.toLocaleLowerCase("ru"),
	},
	capitalize: {
		minArgs: 1,
		maxArgs: 1,
		snippet: "{{ capitalize(поле) }}",
		hint: "Заглавная",
		title: "С заглавной",
		description: "Делает первую букву заглавной, остальные не трогает.",
		example: "capitalize(город) → Казань",
		target: "text",
		call: ([value]) => value.charAt(0).toLocaleUpperCase("ru") + value.slice(1),
	},
	num: {
		minArgs: 1,
		maxArgs: 1,
		snippet: "{{ num(поле) }}",
		hint: "12 500",
		title: "Число с разрядами",
		description: "Разбивает число на разряды и ставит десятичную запятую.",
		example: "num(12500.5) → 12 500,5",
		target: "text",
		call: ([value]) => formatNumber(value),
	},
};

export const FUNCTION_NAMES = Object.keys(FUNCTIONS);

export function isFunctionName(name: string): boolean {
	return Object.hasOwn(FUNCTIONS, name);
}
