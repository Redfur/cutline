import { useEffect, useRef, useState } from "react";
import type { CutlineElement, Guide } from "../../model/document";
import { Icon } from "../../ui/core/Icon";
import { LayerRow } from "../../ui/editor/LayerRow";
import styles from "./LayersPanel.module.css";

export interface LayerPatch {
	locked?: boolean;
	visible?: boolean;
	name?: string;
}

export interface LayersPanelProps {
	elements: CutlineElement[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	onLayerChange: (id: string, patch: LayerPatch) => void;
	onReorder: (elements: CutlineElement[]) => void;
	guides: Guide[];
	selectedGuideId: string | null;
	onSelectGuide: (id: string) => void;
}

// Строка направляющей в списке слоёв — не переиспользует LayerRow: у направляющих
// нет замка/видимости/переименования/своего места в z-порядке элементов, натягивать
// эти концепции на них было бы искусственно ради общего компонента.
function GuideRow({
	guide,
	selected,
	onClick,
}: {
	guide: Guide;
	selected: boolean;
	onClick: () => void;
}) {
	const label = Number.isInteger(guide.positionMm)
		? guide.positionMm
		: Math.round(guide.positionMm * 10) / 10;
	return (
		<button
			type="button"
			onClick={onClick}
			className={`${styles.guideRow} ${selected ? styles.selected : ""}`}
		>
			<Icon name="ruler" size={14} />
			{guide.axis === "x" ? "X" : "Y"} · {label} мм
		</button>
	);
}

// Высота строки фиксирована токеном --row-h — позицию вставки при перетаскивании
// можно посчитать по одной только высоте, без ref на каждую строку.
const ROW_HEIGHT_PX = 28;

interface DragState {
	id: string;
	startIndex: number;
	overIndex: number;
}

export function LayersPanel({
	elements,
	selectedId,
	onSelect,
	onLayerChange,
	onReorder,
	guides,
	selectedGuideId,
	onSelectGuide,
}: LayersPanelProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [drag, setDrag] = useState<DragState | null>(null);

	// последний элемент массива рисуется поверх остальных на холсте — значит, он верхний слой в списке
	const displayed = [...elements].reverse();

	// Рефы, а не замыкание на displayed/onReorder: эффект ниже подписывается на
	// window один раз за драг (по drag?.id), но должен читать самые свежие
	// значения на mousemove/mouseup, а не то, что было на момент mousedown.
	const displayedRef = useRef(displayed);
	displayedRef.current = displayed;
	const onReorderRef = useRef(onReorder);
	onReorderRef.current = onReorder;

	const dragId = drag?.id ?? null;

	useEffect(() => {
		if (!dragId) return;
		function clamp(i: number) {
			return Math.max(0, Math.min(displayedRef.current.length - 1, i));
		}
		function handleMouseMove(e: MouseEvent) {
			const container = containerRef.current;
			if (!container) return;
			const offsetY =
				e.clientY - container.getBoundingClientRect().top + container.scrollTop;
			const overIndex = clamp(Math.round(offsetY / ROW_HEIGHT_PX - 0.5));
			setDrag((d) => (d ? { ...d, overIndex } : d));
		}
		function handleMouseUp() {
			setDrag((current) => {
				if (current && current.overIndex !== current.startIndex) {
					const reordered = [...displayedRef.current];
					const [moved] = reordered.splice(current.startIndex, 1);
					reordered.splice(current.overIndex, 0, moved);
					// reordered идёт в обратном порядке относительно elements — переворачиваем обратно перед коммитом
					onReorderRef.current([...reordered].reverse());
				}
				return null;
			});
		}
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [dragId]);

	return (
		<div ref={containerRef} className={styles.panel}>
			{elements.length === 0 ? (
				<div className={styles.empty}>
					Элементов нет. Добавьте первый через панель инструментов слева.
				</div>
			) : (
				displayed.map((el, index) => (
					<div key={el.id} className={styles.row}>
						{drag && drag.overIndex === index && (
							<div className={styles.dropIndicator} />
						)}
						<LayerRow
							type={el.type}
							name={el.name}
							locked={el.locked}
							hidden={!el.visible}
							selected={el.id === selectedId}
							onClick={() => onSelect(el.id)}
							onToggleLock={() => onLayerChange(el.id, { locked: !el.locked })}
							onToggleVisible={() =>
								onLayerChange(el.id, { visible: !el.visible })
							}
							onRename={(name) => onLayerChange(el.id, { name })}
							onDragHandleMouseDown={() =>
								setDrag({ id: el.id, startIndex: index, overIndex: index })
							}
							style={drag?.id === el.id ? { opacity: 0.5 } : undefined}
						/>
					</div>
				))
			)}
			{guides.length > 0 && (
				<>
					<div className={styles.sectionTitle}>Направляющие</div>
					{guides.map((guide) => (
						<GuideRow
							key={guide.id}
							guide={guide}
							selected={guide.id === selectedGuideId}
							onClick={() => onSelectGuide(guide.id)}
						/>
					))}
				</>
			)}
		</div>
	);
}
