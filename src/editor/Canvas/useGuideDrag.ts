// Тянем направляющую с линейки (новую) или двигаем существующую — тот же принцип,
// что и у драга элемента (useElementDrag): только live-превью здесь, один
// onGuidesChange на mouseup.
import { type RefObject, useEffect, useRef, useState } from "react";
import type { Guide } from "../../model/document";

interface GuideDragState {
	id: string | null;
	axis: "x" | "y";
	// текущая позиция существующей направляющей на момент mousedown — нужна, чтобы
	// отличить «отпустили без единого mousemove» (клик) от «утащили обратно на
	// линейку» (оба дают liveGuideMm не тронутым с начала жеста)
	startPositionMm?: number;
}

export function useGuideDrag({
	guides,
	pxPerMm,
	originXPx,
	originYPx,
	contentRef,
	rulerXStripRef,
	rulerYStripRef,
	onGuidesChange,
	onSelectGuide,
}: {
	guides: Guide[];
	pxPerMm: number;
	originXPx: number;
	originYPx: number;
	contentRef: RefObject<HTMLDivElement | null>;
	rulerXStripRef: RefObject<HTMLDivElement | null>;
	rulerYStripRef: RefObject<HTMLDivElement | null>;
	onGuidesChange: (guides: Guide[], options?: { boundary?: boolean }) => void;
	onSelectGuide: (id: string | null) => void;
}) {
	const [guideDrag, setGuideDrag] = useState<GuideDragState | null>(null);
	// null = курсор сейчас над «своей» линейкой — при отпускании отмена/удаление, а не
	// перенос в (0,0); ref — чтобы mouseup в эффекте ниже читал актуальное значение,
	// а не то, что было на момент подписки (тот же приём, что и у liveElementRef)
	const [liveGuideMm, setLiveGuideMm] = useState<number | null>(null);
	const liveGuideMmRef = useRef<number | null>(null);

	useEffect(() => {
		if (!guideDrag) return;
		function handleMouseMove(e: MouseEvent) {
			if (!guideDrag) return;
			const ownRulerRect =
				guideDrag.axis === "x"
					? rulerXStripRef.current?.getBoundingClientRect()
					: rulerYStripRef.current?.getBoundingClientRect();
			const overOwnRuler =
				guideDrag.axis === "x"
					? ownRulerRect && e.clientY < ownRulerRect.bottom
					: ownRulerRect && e.clientX < ownRulerRect.right;
			if (overOwnRuler) {
				liveGuideMmRef.current = null;
				setLiveGuideMm(null);
				return;
			}
			const contentRect = contentRef.current?.getBoundingClientRect();
			if (!contentRect) return;
			const mm =
				guideDrag.axis === "x"
					? (e.clientX - contentRect.left - originXPx) / pxPerMm
					: (e.clientY - contentRect.top - originYPx) / pxPerMm;
			liveGuideMmRef.current = mm;
			setLiveGuideMm(mm);
		}
		function handleMouseUp() {
			if (!guideDrag) return;
			const positionMm = liveGuideMmRef.current;
			if (positionMm !== null) {
				if (guideDrag.id) {
					// обычный клик без движения — positionMm остался равен стартовой
					// позиции (инициализирован ею же на mousedown), реального переноса
					// не было, лишний шаг истории не нужен
					if (positionMm !== guideDrag.startPositionMm) {
						onGuidesChange(
							guides.map((g) =>
								g.id === guideDrag.id ? { ...g, positionMm } : g,
							),
							{ boundary: true },
						);
					}
				} else {
					// выделяем сразу — как handlePlace выделяет только что созданный элемент
					const newId = crypto.randomUUID();
					onGuidesChange(
						[...guides, { id: newId, axis: guideDrag.axis, positionMm }],
						{ boundary: true },
					);
					onSelectGuide(newId);
				}
			} else if (guideDrag.id) {
				// отпустили над своей линейкой — удаление существующей направляющей
				onGuidesChange(
					guides.filter((g) => g.id !== guideDrag.id),
					{ boundary: true },
				);
				onSelectGuide(null);
			}
			liveGuideMmRef.current = null;
			setLiveGuideMm(null);
			setGuideDrag(null);
		}
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [
		guideDrag,
		pxPerMm,
		originXPx,
		originYPx,
		onGuidesChange,
		onSelectGuide,
		guides,
		contentRef,
		rulerXStripRef,
		rulerYStripRef,
	]);

	return {
		guideDrag,
		liveGuideMm,
		// новая направляющая с линейки: до первого mousemove позиции нет (null)
		startNewGuide(axis: "x" | "y") {
			liveGuideMmRef.current = null;
			setLiveGuideMm(null);
			setGuideDrag({ id: null, axis });
		},
		startMoveGuide(guide: Guide) {
			// инициализируем текущей позицией, а не null — иначе
			// обычный клик без единого mousemove неотличим от
			// «отпустили над линейкой» и направляющая бы удалялась
			liveGuideMmRef.current = guide.positionMm;
			setLiveGuideMm(guide.positionMm);
			setGuideDrag({
				id: guide.id,
				axis: guide.axis,
				startPositionMm: guide.positionMm,
			});
		},
	};
}
