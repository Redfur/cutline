// Схема соответствует docs/document-model.md. Корневой тип назван CutlineDocument,
// а не Document/Element — эти имена уже заняты DOM-типами lib.dom, с которыми
// рендерер и холст будут работать бок о бок.

export type ElementType = "text" | "rect" | "ellipse" | "line" | "image";

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
}

export type FontWeight = "regular" | "bold";
export type TextAlign = "left" | "center" | "right";
export type TextValign = "top" | "middle" | "baseline";
export type TextFit = "shrink" | "clip" | "wrap" | "none";
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
	fit: TextFit;
	transform: TextTransform;
}

export interface RectElement extends ElementBase {
	type: "rect";
	fill: string | null;
	stroke: string | null;
	strokeWidth: number;
	radius: number;
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

export interface ImageElement extends ElementBase {
	type: "image";
	src: string;
	fit: ImageFit;
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

export interface CutlineDocument {
	version: number;
	canvas: Canvas;
	fonts: FontRef[];
	elements: CutlineElement[];
	records: DataRecord[];
	fields: FieldDef[];
}
