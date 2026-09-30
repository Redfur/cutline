import { describe, expect, it } from "vitest";
import type {
	CutlineDocument,
	CutlineElement,
	FillDirection,
	ImageElement,
	RectElement,
} from "../model/document";
import { DEFAULT_QR_STYLE } from "../model/migrate";
import { blankDocument } from "./fixtures/blank";
import { render } from "./render";

function image(patch: Partial<ImageElement>): ImageElement {
	return {
		id: "img",
		name: "Картинка",
		type: "image",
		x: 10,
		y: 20,
		w: 30,
		h: 40,
		rotation: 0,
		locked: false,
		visible: true,
		src: "https://x.example/a.png",
		fit: "contain",
		background: null,
		qr: DEFAULT_QR_STYLE,
		...patch,
	};
}

const doc = (el: CutlineElement): CutlineDocument => ({
	...blankDocument,
	elements: [el],
});
const opts = { outlines: null, bleed: false, n: 1, preview: null };

describe("фон картинки", () => {
	it("прозрачный — только картинка", () => {
		const svg = render(doc(image({})), {}, opts);
		expect(svg).toContain("<image");
		expect(svg).not.toContain('fill="#FFEEDD"');
	});

	it("цвет — прямоугольник на всю рамку под картинкой", () => {
		const svg = render(doc(image({ background: "#FFEEDD" })), {}, opts);
		const rect = '<rect x="10" y="20" width="30" height="40" fill="#FFEEDD"/>';
		expect(svg).toContain(rect);
		expect(svg.indexOf(rect)).toBeLessThan(svg.indexOf("<image"));
	});

	it("фон остаётся и без картинки, и под QR", () => {
		expect(
			render(doc(image({ src: "", background: "#FFEEDD" })), {}, opts),
		).toContain('fill="#FFEEDD"');
		const qr = render(
			doc(image({ src: '{{ qr("x") }}', background: "#FFEEDD" })),
			{},
			opts,
		);
		expect(qr.indexOf('fill="#FFEEDD"')).toBeLessThan(
			qr.indexOf('fill="#000000"'),
		);
	});
});

describe("заглушка картинки — только в редакторе", () => {
	const preview = { brokenImages: new Set(["https://x.example/broken.png"]) };

	it("пустой источник: в редакторе рамка с крестом, в экспорте — ничего", () => {
		const empty = doc(image({ src: "{{photo}}" }));
		const edited = render(empty, { photo: "" }, { ...opts, preview });
		expect(edited).toContain('stroke="#B5B5AE"');
		expect(edited).toContain("<line");
		expect(render(empty, { photo: "" }, opts)).not.toContain("<line");
	});

	it("не загрузилась: оранжевая заглушка вместо <image>, в экспорте — сама ссылка", () => {
		const broken = doc(image({ src: "https://x.example/broken.png" }));
		const edited = render(broken, {}, { ...opts, preview });
		expect(edited).toContain('stroke="#D97706"');
		expect(edited).not.toContain("<image");
		expect(render(broken, {}, opts)).toContain("<image");
	});

	it("с фоном заглушка не закрывает его заливкой", () => {
		const svg = render(
			doc(image({ src: "", background: "#FFEEDD" })),
			{},
			{ ...opts, preview },
		);
		expect(svg).toContain('fill="#FFEEDD"');
		expect(svg).toContain('fill="none" stroke="#B5B5AE"');
	});
});

function bar(direction: FillDirection, patch: Partial<RectElement> = {}) {
	const el: RectElement = {
		id: "bar",
		name: "Полоска",
		type: "rect",
		x: 10,
		y: 20,
		w: 40,
		h: 8,
		rotation: 0,
		locked: false,
		visible: true,
		fill: "#112233",
		stroke: null,
		strokeWidth: 0,
		radius: 0,
		progress: { value: "{{p}}", direction },
		...patch,
	};
	return el;
}

describe("заполнение прямоугольника по данным", () => {
	const at = (el: RectElement, p: string) => render(doc(el), { p }, opts);

	it("доля от якорного края в каждую сторону", () => {
		expect(at(bar("right"), "25")).toContain(
			'<rect x="10" y="20" width="10" height="8"',
		);
		expect(at(bar("left"), "25")).toContain(
			'<rect x="40" y="20" width="10" height="8"',
		);
		expect(at(bar("down", { h: 40 }), "25")).toContain(
			'<rect x="10" y="20" width="40" height="10"',
		);
		expect(at(bar("up", { h: 40 }), "25")).toContain(
			'<rect x="10" y="50" width="40" height="10"',
		);
	});

	it("0% и пусто — ничего, 100% — вся рамка", () => {
		expect(at(bar("right"), "0")).not.toContain('<rect x="10"');
		expect(at(bar("right"), "")).not.toContain('<rect x="10"');
		expect(at(bar("right"), "100")).toContain(
			'<rect x="10" y="20" width="40" height="8"',
		);
	});

	it("радиус не больше половины меньшей стороны полоски", () => {
		expect(at(bar("right", { radius: 4 }), "5")).toContain(
			'width="2" height="8" rx="1"',
		);
		expect(at(bar("right", { radius: 10 }), "100")).toContain('rx="4"');
	});

	it("поворот — вокруг центра полной рамки", () => {
		expect(at(bar("right", { rotation: 30 }), "25")).toContain(
			"rotate(30 30 24)",
		);
	});
});
