// Схема соответствует docs/document-model.md. Корневой тип назван CutlineDocument,
// а не Document/Element — эти имена уже заняты DOM-типами lib.dom, с которыми
// рендерер и холст будут работать бок о бок.

export type ElementType = "text" | "rect" | "ellipse" | "line" | "image";

// Показ элемента по данным (v11): плашка под {{Должность}} пропадает вместе с пустым
// полем. У каждого элемента своё условие, а не ссылка на соседа: ссылки ломались бы
// при удалении и дублировании, а групп нет
export interface ShowCondition {
	// шаблон, как content у текста: «{{Должность}}»
	value: string;
	// показывать, если после подстановки непусто (без пробелов по краям) / пусто
	when: "filled" | "empty";
}

interface ElementBase {
	id: string;
	name: string;
	type: ElementType;
	x: number;
	y: number;
	w: number;
	h: number;
	rotation: number;
	locked: boolean;
	visible: boolean;
	// null — показывать всегда; visible: false скрывает независимо от условия
	condition: ShowCondition | null;
}

// Как CSS font-weight: число уходит в ctx.font, FontFace и атрибут <text> без перевода.
// Не у каждого встроенного семейства есть все четыре — файл подбирается resolveWeight
// (src/fonts/bundled.ts)
export type FontWeight = 400 | 500 | 600 | 700;
export type TextAlign = "left" | "center" | "right";
// Где строки-коробки стоят в рамке ручной высоты (v9; раньше вместо bottom был
// baseline — базовая линия на нижнем крае)
export type TextValign = "top" | "middle" | "bottom";
// line — однострочный: не переносит, ручные переносы становятся пробелом; block —
// перенос по словам и по \n (v7, раньше — один режим fit на всё)
export type TextMode = "line" | "block";
export type TextTransform = "none" | "upper" | "lower";

export interface TextElement extends ElementBase {
	type: "text";
	content: string;
	font: string;
	weight: FontWeight;
	size: number;
	minSize: number;
	lineHeight: number;
	tracking: number;
	align: TextAlign;
	valign: TextValign;
	color: string;
	mode: TextMode;
	// уменьшать кегль до minSize, пока не влезет (строка — по ширине, блок — в лимит строк)
	shrink: boolean;
	// не влезло — обрезать с «…»: у строки в конце строки, у блока — последней разрешённой
	ellipsis: boolean;
	// только у блока: лимит строк, высота рамки считается по нему (editor/lib/textBox.ts);
	// null — без лимита, высота рамки ручная
	maxLines: number | null;
	transform: TextTransform;
}

// Куда растёт заполнение от якорного края: right — от левого края вправо и т.д.
export type FillDirection = "right" | "left" | "up" | "down";

// Заполнение по данным (v10): рамка элемента — 100%, рисуется доля из value.
// Групп нет, поэтому база — своя рамка, а не соседний элемент: дорожка под полоской —
// отдельный прямоугольник того же размера
export interface RectProgress {
	// шаблон с плейсхолдерами, как content у текста: «{{ Прогресс }}» → 0–100
	value: string;
	direction: FillDirection;
}

export interface RectElement extends ElementBase {
	type: "rect";
	fill: string | null;
	stroke: string | null;
	strokeWidth: number;
	radius: number;
	// null — обычный прямоугольник во всю рамку
	progress: RectProgress | null;
}

export interface EllipseElement extends ElementBase {
	type: "ellipse";
	fill: string | null;
	stroke: string | null;
	strokeWidth: number;
}

export interface LineElement extends ElementBase {
	type: "line";
	stroke: string | null;
	strokeWidth: number;
}

export type ImageFit = "cover" | "contain" | "fill";

// Оформление QR-кода — свойство элемента, а не аргумент qr(): аргументы склеиваются
// в текст кода. Действует, когда источник картинки — {{ qr(…) }} (v6)
export interface QrStyle {
	color: string;
	modules: "square" | "rounded" | "dots";
	// три угловых квадрата («глаза»), по ним сканер находит код
	eyes: "square" | "rounded" | "circle";
}

export interface ImageElement extends ElementBase {
	type: "image";
	src: string;
	fit: ImageFit;
	// под картинкой или QR-кодом, на всю рамку; null — прозрачный (v5)
	background: string | null;
	qr: QrStyle;
}

export type CutlineElement =
	| TextElement
	| RectElement
	| EllipseElement
	| LineElement
	| ImageElement;

export interface Canvas {
	w: number;
	h: number;
	bleed: number;
	safe: number;
	background: string;
}

export type FontSource = "bundled" | "user";

export interface FontRef {
	family: string;
	weight: FontWeight;
	source: FontSource;
	file?: string;
}

export interface FieldDef {
	key: string;
	label: string;
	sample: string;
}

export type DataRecord = Record<string, string>;

// Пользовательские направляющие (тянутся с линейки) — цели примагничивания, которые
// расставляет сам пользователь, в дополнение к обрезу/вылету/безопасному полю/другим
// элементам. Не печатаются и не участвуют в render() — это чисто редакторская сущность,
// но живёт в документе (не в состоянии редактора), чтобы попадать под undo/redo и
// сохраняться вместе с макетом, как и было задумано в CLAUDE.md для модели документа.
export interface Guide {
	id: string;
	axis: "x" | "y";
	positionMm: number;
}

export interface CutlineDocument {
	version: number;
	// имя в шапке и в списке документов; едет с файлом и проходит undo/redo, как любая правка
	name: string;
	canvas: Canvas;
	fonts: FontRef[];
	elements: CutlineElement[];
	records: DataRecord[];
	fields: FieldDef[];
	guides: Guide[];
}
