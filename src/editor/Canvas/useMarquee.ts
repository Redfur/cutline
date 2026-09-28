// Рамка выделения: нажали инструментом «Выделение» мимо элементов и потянули.
// Пока мышь не ушла дальше порога — это клик, и его обрабатывает обычный click
// (снять выделение); рамка появляется только после порога, как у инструментов.
import { type RefObject, useEffect, useRef, useState } from "react";
import type { CutlineElement } from "../../model/document";
import type { Bounds } from "../lib/geometry";
import { elementsInRect } from "../lib/selection";
import { DRAG_THRESHOLD_PX } from "./constants";
import { swallowNextClick } from "./swallowNextClick";

interface MarqueeState {
	startClientX: number;
	startClientY: number;
	// Shift — добавить к тому, что уже выделено
	additive: boolean;
	base: string[];
}

export function useMarquee({
	elements,
	pxPerMm,
	originXPx,
	originYPx,
	contentRef,
	onSelect,
}: {
	elements: CutlineElement[];
	pxPerMm: number;
	originXPx: number;
	originYPx: number;
	contentRef: RefObject<HTMLDivElement | null>;
	onSelect: (ids: string[]) => void;
}) {
	const [state, setState] = useState<MarqueeState | null>(null);
	// рамка в мм от угла обреза; null — ещё не вышли за порог
	const [rect, setRect] = useState<Bounds | null>(null);
	const rectRef = useRef<Bounds | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: пересчёт мм зависит ровно от перечисленного, contentRef — ref
	useEffect(() => {
		if (!state) return;
		const toMm = (clientX: number, clientY: number) => {
			const box = contentRef.current?.getBoundingClientRect();
			if (!box) return null;
			return {
				x: (clientX - box.left - originXPx) / pxPerMm,
				y: (clientY - box.top - originYPx) / pxPerMm,
			};
		};
		const selectIn = (r: Bounds) => {
			const hit = elementsInRect(elements, r);
			onSelect(
				state.additive
					? [...state.base, ...hit.filter((id) => !state.base.includes(id))]
					: hit,
			);
		};

		function handleMouseMove(e: MouseEvent) {
			if (!state) return;
			const dist = Math.hypot(
				e.clientX - state.startClientX,
				e.clientY - state.startClientY,
			);
			if (!rectRef.current && dist < DRAG_THRESHOLD_PX) return;
			const a = toMm(state.startClientX, state.startClientY);
			const b = toMm(e.clientX, e.clientY);
			if (!a || !b) return;
			const r = {
				x: Math.min(a.x, b.x),
				y: Math.min(a.y, b.y),
				w: Math.abs(a.x - b.x),
				h: Math.abs(a.y - b.y),
			};
			rectRef.current = r;
			setRect(r);
			// выделение обновляется на ходу — видно, что уже попало в рамку
			selectIn(r);
		}
		function handleMouseUp() {
			// после рамки браузер шлёт click на область — он снял бы выделение
			if (rectRef.current) swallowNextClick();
			rectRef.current = null;
			setRect(null);
			setState(null);
		}
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [state, elements, pxPerMm, originXPx, originYPx, onSelect]);

	return {
		marquee: rect,
		startMarquee(
			e: { clientX: number; clientY: number; shiftKey: boolean },
			selectedIds: string[],
		) {
			setState({
				startClientX: e.clientX,
				startClientY: e.clientY,
				additive: e.shiftKey,
				base: selectedIds,
			});
		},
	};
}
