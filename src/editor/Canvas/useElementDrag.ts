// Во время драга/resize документ в истории не трогаем (CLAUDE.md требует историю
// с первого дня, а не по шагу на каждый mousemove) — только локальное live-превью
// здесь, в Canvas; в историю уходит один вызов на mouseup с итогом. Перемещение —
// всей группы выделенных (один шаг истории на всех), резайз и концы линии — одного.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CutlineDocument, CutlineElement } from "../../model/document";
import { cleanGeometry, roundMouseMm } from "../lib/geometry";
import {
	type HandlePos,
	type LineEnd,
	moveLineEnd,
	resizeElement,
	resizeRotated,
} from "../lib/resizeElement";
import { selectionBounds } from "../lib/selection";
import {
	type BorderVisibility,
	type SnapGuide,
	snapMove,
	snapResize,
} from "../lib/snap";
import { SNAP_THRESHOLD_PX } from "./constants";
import { swallowNextClick } from "./swallowNextClick";

interface DragState {
	kind: "move" | "resize" | "lineEnd";
	handle?: HandlePos;
	end?: LineEnd;
	startClientX: number;
	startClientY: number;
	// резайз и концы линии — ровно один элемент; перемещение — вся группа
	startElements: CutlineElement[];
	// отпустили, не сдвинув: у группы клик по одному из её элементов выделяет только его
	onNoMove?: () => void;
}

interface ClientPoint {
	clientX: number;
	clientY: number;
}

export function useElementDrag({
	doc,
	borders,
	pxPerMm,
	onElementChange,
	onElementsChange,
}: {
	doc: CutlineDocument;
	// видимые границы холста — только к ним и примагничиваем
	borders: BorderVisibility;
	pxPerMm: number;
	onElementChange: (
		element: CutlineElement,
		options?: { boundary?: boolean },
	) => void;
	onElementsChange: (
		elements: CutlineElement[],
		options?: { boundary?: boolean },
	) => void;
}) {
	const [drag, setDrag] = useState<DragState | null>(null);
	const [liveElements, setLiveElements] = useState<CutlineElement[] | null>(
		null,
	);
	const liveElementsRef = useRef<CutlineElement[] | null>(null);
	const setLive = useCallback((els: CutlineElement[] | null) => {
		liveElementsRef.current = els;
		setLiveElements(els);
	}, []);
	const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

	useEffect(() => {
		if (!drag) return;
		function handleMouseMove(e: MouseEvent) {
			if (!drag) return;
			const dxMm = roundMouseMm((e.clientX - drag.startClientX) / pxPerMm);
			const dyMm = roundMouseMm((e.clientY - drag.startClientY) / pxPerMm);
			const dragged = new Set(drag.startElements.map((el) => el.id));
			const others = doc.elements.filter(
				(el) => !dragged.has(el.id) && el.visible,
			);
			const thresholdMm = SNAP_THRESHOLD_PX / pxPerMm;
			const [startElement] = drag.startElements;
			if (drag.kind === "move") {
				// группа примагничивается общей рамкой, как один элемент
				const start = selectionBounds(drag.startElements);
				if (!start) return;
				const snapped = snapMove(
					{ ...start, x: start.x + dxMm, y: start.y + dyMm },
					others,
					doc.canvas,
					doc.guides,
					thresholdMm,
					borders,
				);
				const sx = snapped.x - start.x;
				const sy = snapped.y - start.y;
				setLive(
					drag.startElements.map((el) => ({
						...el,
						x: el.x + sx,
						y: el.y + sy,
					})),
				);
				setSnapGuides(snapped.guides);
			} else if (drag.kind === "lineEnd") {
				const end = drag.end as LineEnd;
				const moved = moveLineEnd(startElement, end, dxMm, dyMm);
				// привязываем только тянущийся конец — как точку: бокс нулевого размера
				// в snapMove даёт ровно эту точку по обеим осям, отдельный хелпер не нужен
				const px = end === "end" ? moved.x + moved.w : moved.x;
				const py = end === "end" ? moved.y + moved.h : moved.y;
				const snapped = snapMove(
					{ x: px, y: py, w: 0, h: 0 },
					others,
					doc.canvas,
					doc.guides,
					thresholdMm,
					borders,
				);
				const updated = moveLineEnd(
					startElement,
					end,
					dxMm + snapped.x - px,
					dyMm + snapped.y - py,
				);
				setLive([updated]);
				setSnapGuides(snapped.guides);
			} else {
				const handle = drag.handle as HandlePos;
				if (startElement.rotation) {
					// у повёрнутого элемента края не параллельны осям холста — привязка
					// краёв к вертикалям/горизонталям тут не имеет смысла
					const resized = resizeRotated(startElement, handle, dxMm, dyMm);
					setLive([resized]);
					setSnapGuides([]);
					return;
				}
				const resized = resizeElement(startElement, handle, dxMm, dyMm);
				const snapped = snapResize(
					resized,
					handle,
					others,
					doc.canvas,
					doc.guides,
					thresholdMm,
					borders,
				);
				const updated = {
					...resized,
					x: snapped.x,
					y: snapped.y,
					w: snapped.w,
					h: snapped.h,
				};
				setLive([updated]);
				setSnapGuides(snapped.guides);
			}
		}
		function handleMouseUp() {
			const live = liveElementsRef.current;
			if (live) {
				// дельта мыши в мм и привязка к соседям дают хвосты вроде 47.37500000000001
				const cleaned = new Map(live.map((el) => [el.id, cleanGeometry(el)]));
				if (drag?.kind === "move") {
					onElementsChange(
						doc.elements.map((el) => cleaned.get(el.id) ?? el),
						{ boundary: true },
					);
				} else {
					for (const el of cleaned.values()) {
						onElementChange(el, { boundary: true });
					}
				}
				swallowNextClick();
			} else {
				drag?.onNoMove?.();
			}
			setLive(null);
			setSnapGuides([]);
			setDrag(null);
		}
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [drag, pxPerMm, onElementChange, onElementsChange, doc, borders, setLive]);

	return {
		liveElements,
		snapGuides,
		startMove(
			elements: CutlineElement[],
			at: ClientPoint,
			onNoMove?: () => void,
		) {
			setDrag({
				kind: "move",
				startClientX: at.clientX,
				startClientY: at.clientY,
				startElements: elements,
				onNoMove,
			});
		},
		startLineEnd(el: CutlineElement, end: LineEnd, at: ClientPoint) {
			setDrag({
				kind: "lineEnd",
				end,
				startClientX: at.clientX,
				startClientY: at.clientY,
				startElements: [el],
			});
		},
		startResize(el: CutlineElement, handle: HandlePos, at: ClientPoint) {
			setDrag({
				kind: "resize",
				handle,
				startClientX: at.clientX,
				startClientY: at.clientY,
				startElements: [el],
			});
		},
	};
}
