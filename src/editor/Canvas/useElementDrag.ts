// Во время драга/resize документ в истории не трогаем (CLAUDE.md требует историю
// с первого дня, а не по шагу на каждый mousemove) — только локальное live-превью
// здесь, в Canvas; в историю уходит один onElementChange на mouseup с итогом.
import { useEffect, useRef, useState } from "react";
import type { CutlineDocument, CutlineElement } from "../../model/document";
import {
	type HandlePos,
	type LineEnd,
	moveElement,
	moveLineEnd,
	resizeElement,
} from "../lib/resizeElement";
import { type SnapGuide, snapMove, snapResize } from "../lib/snap";
import { SNAP_THRESHOLD_PX } from "./constants";
import { swallowNextClick } from "./swallowNextClick";

interface DragState {
	kind: "move" | "resize" | "lineEnd";
	handle?: HandlePos;
	end?: LineEnd;
	startClientX: number;
	startClientY: number;
	startElement: CutlineElement;
}

interface ClientPoint {
	clientX: number;
	clientY: number;
}

export function useElementDrag({
	doc,
	pxPerMm,
	onElementChange,
}: {
	doc: CutlineDocument;
	pxPerMm: number;
	onElementChange: (
		element: CutlineElement,
		options?: { boundary?: boolean },
	) => void;
}) {
	const [drag, setDrag] = useState<DragState | null>(null);
	const [liveElement, setLiveElement] = useState<CutlineElement | null>(null);
	const liveElementRef = useRef<CutlineElement | null>(null);
	const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

	useEffect(() => {
		if (!drag) return;
		function handleMouseMove(e: MouseEvent) {
			if (!drag) return;
			const dxMm = (e.clientX - drag.startClientX) / pxPerMm;
			const dyMm = (e.clientY - drag.startClientY) / pxPerMm;
			const others = doc.elements.filter(
				(el) => el.id !== drag.startElement.id && el.visible,
			);
			const thresholdMm = SNAP_THRESHOLD_PX / pxPerMm;
			if (drag.kind === "move") {
				const moved = moveElement(drag.startElement, dxMm, dyMm);
				const snapped = snapMove(
					moved,
					others,
					doc.canvas,
					doc.guides,
					thresholdMm,
				);
				const updated = { ...moved, x: snapped.x, y: snapped.y };
				liveElementRef.current = updated;
				setLiveElement(updated);
				setSnapGuides(snapped.guides);
			} else if (drag.kind === "lineEnd") {
				const end = drag.end as LineEnd;
				const moved = moveLineEnd(drag.startElement, end, dxMm, dyMm);
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
				);
				const updated = moveLineEnd(
					drag.startElement,
					end,
					dxMm + snapped.x - px,
					dyMm + snapped.y - py,
				);
				liveElementRef.current = updated;
				setLiveElement(updated);
				setSnapGuides(snapped.guides);
			} else {
				const resized = resizeElement(
					drag.startElement,
					drag.handle as HandlePos,
					dxMm,
					dyMm,
				);
				const snapped = snapResize(
					resized,
					drag.handle as HandlePos,
					others,
					doc.canvas,
					doc.guides,
					thresholdMm,
				);
				const updated = {
					...resized,
					x: snapped.x,
					y: snapped.y,
					w: snapped.w,
					h: snapped.h,
				};
				liveElementRef.current = updated;
				setLiveElement(updated);
				setSnapGuides(snapped.guides);
			}
		}
		function handleMouseUp() {
			if (liveElementRef.current) {
				onElementChange(liveElementRef.current, { boundary: true });
				swallowNextClick();
			}
			liveElementRef.current = null;
			setLiveElement(null);
			setSnapGuides([]);
			setDrag(null);
		}
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [drag, pxPerMm, onElementChange, doc]);

	return {
		liveElement,
		snapGuides,
		startMove(el: CutlineElement, at: ClientPoint) {
			setDrag({
				kind: "move",
				startClientX: at.clientX,
				startClientY: at.clientY,
				startElement: el,
			});
		},
		startLineEnd(el: CutlineElement, end: LineEnd, at: ClientPoint) {
			setDrag({
				kind: "lineEnd",
				end,
				startClientX: at.clientX,
				startClientY: at.clientY,
				startElement: el,
			});
		},
		startResize(el: CutlineElement, handle: HandlePos, at: ClientPoint) {
			setDrag({
				kind: "resize",
				handle,
				startClientX: at.clientX,
				startClientY: at.clientY,
				startElement: el,
			});
		},
	};
}
