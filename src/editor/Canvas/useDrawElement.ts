// Создание элемента инструментом: обычный клик — элемент размера по умолчанию с
// центром в точке клика; нажали и потянули — рамка от точки нажатия до курсора.
// Как и драг элемента, в историю уходит один коммит на mouseup, а до него — только
// черновик для превью.
import { type RefObject, useEffect, useRef, useState } from "react";
import type {
	CutlineDocument,
	CutlineElement,
	ElementType,
} from "../../model/document";
import { drawElement, placeElement } from "../lib/createElement";
import { type SnapGuide, snapMove, snapResize } from "../lib/snap";
import { SNAP_THRESHOLD_PX } from "./constants";
import { swallowNextClick } from "./swallowNextClick";

// Порог в экранных пикселях, не в мм: дрожь руки при клике не зависит от зума
const DRAG_THRESHOLD_PX = 3;
// Точку нажатия округляем до 0.1 мм — иначе в инспекторе у нового элемента
// «37.238671875» вместо «37.2»; точнее на печати всё равно не видно
const ROUND_MM = 10;

interface PointMm {
	x: number;
	y: number;
}

interface DrawState {
	type: ElementType;
	startClientX: number;
	startClientY: number;
	from: PointMm;
}

const roundMm = (v: number) => Math.round(v * ROUND_MM) / ROUND_MM;
// Привязка берёт координаты соседних элементов вместе с их float-шумом, и в
// инспекторе у нового элемента выходило «11.899999999999991». Округляем до 1e-6 мм —
// шум уходит, а совпадение с краем соседа остаётся точным
const clean = (v: number) => Math.round(v * 1e6) / 1e6;

export function useDrawElement({
	doc,
	pxPerMm,
	originXPx,
	originYPx,
	contentRef,
	onCreate,
}: {
	doc: CutlineDocument;
	pxPerMm: number;
	originXPx: number;
	originYPx: number;
	contentRef: RefObject<HTMLDivElement | null>;
	onCreate: (element: CutlineElement) => void;
}) {
	const [draw, setDraw] = useState<DrawState | null>(null);
	const [draft, setDraft] = useState<CutlineElement | null>(null);
	const draftRef = useRef<CutlineElement | null>(null);
	const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

	const toMm = (clientX: number, clientY: number): PointMm | null => {
		const rect = contentRef.current?.getBoundingClientRect();
		if (!rect) return null;
		return {
			x: roundMm((clientX - rect.left - originXPx) / pxPerMm),
			y: roundMm((clientY - rect.top - originYPx) / pxPerMm),
		};
	};

	// toMm пересоздаётся на каждый рендер, но зависит ровно от того, что в зависимостях
	// biome-ignore lint/correctness/useExhaustiveDependencies: см. выше
	useEffect(() => {
		if (!draw) return;
		const others = doc.elements.filter((el) => el.visible);
		const thresholdMm = SNAP_THRESHOLD_PX / pxPerMm;
		// точку как бокс нулевого размера — snapMove даёт её привязку по обеим осям
		const snapPoint = (p: PointMm) => {
			const s = snapMove(
				{ ...p, w: 0, h: 0 },
				others,
				doc.canvas,
				doc.guides,
				thresholdMm,
			);
			return { point: { x: s.x, y: s.y }, guides: s.guides };
		};

		const reset = () => {
			draftRef.current = null;
			setDraft(null);
			setSnapGuides([]);
			setDraw(null);
		};

		function handleMouseMove(e: MouseEvent) {
			if (!draw) return;
			const moved = Math.hypot(
				e.clientX - draw.startClientX,
				e.clientY - draw.startClientY,
			);
			if (!draftRef.current && moved < DRAG_THRESHOLD_PX) return;
			const raw = toMm(e.clientX, e.clientY);
			if (!raw) return;
			const constrain = e.shiftKey;
			// начало привязываем всегда, конец — только без Shift: привязка сдвинула бы
			// угол и сломала квадрат или 45°
			const from = snapPoint(draw.from);
			let element = drawElement(draw.type, from.point, raw, { constrain });
			let guides = from.guides;
			if (!constrain) {
				if (draw.type === "line") {
					const end = snapPoint(raw);
					element = drawElement(draw.type, from.point, end.point);
					guides = [...guides, ...end.guides];
				} else {
					// тянется угол, противоположный точке нажатия
					const handle = {
						x: raw.x >= from.point.x ? 1 : 0,
						y: raw.y >= from.point.y ? 1 : 0,
					} as const;
					const s = snapResize(
						element,
						handle,
						others,
						doc.canvas,
						doc.guides,
						thresholdMm,
					);
					element = { ...element, x: s.x, y: s.y, w: s.w, h: s.h };
					guides = [...guides, ...s.guides];
				}
			}
			element = {
				...element,
				x: clean(element.x),
				y: clean(element.y),
				w: clean(element.w),
				h: clean(element.h),
			};
			draftRef.current = element;
			setDraft(element);
			setSnapGuides(guides);
		}

		function handleMouseUp() {
			if (!draw) return;
			onCreate(draftRef.current ?? placeElement(draw.type, draw.from));
			// иначе click после mouseup долетит до серой области и снимет выделение
			// с только что созданного элемента
			swallowNextClick();
			reset();
		}

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key !== "Escape") return;
			e.preventDefault();
			reset();
		}

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [draw, doc, pxPerMm, originXPx, originYPx, onCreate]);

	return {
		draft,
		snapGuides,
		startDraw(type: ElementType, e: { clientX: number; clientY: number }) {
			const from = toMm(e.clientX, e.clientY);
			if (!from) return;
			setDraw({
				type,
				startClientX: e.clientX,
				startClientY: e.clientY,
				from,
			});
		},
	};
}
