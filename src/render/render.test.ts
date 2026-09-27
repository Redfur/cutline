import { describe, expect, it } from "vitest";
import type { CutlineDocument, ImageElement } from "../model/document";
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
		...patch,
	};
}

const doc = (el: ImageElement): CutlineDocument => ({
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
