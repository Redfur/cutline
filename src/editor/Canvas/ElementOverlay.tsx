// Один div-оверлей на элемент документа — по нему выделяют, двигают и ресайзят. render()
// рисует карточку одним непрозрачным SVG-блобом (архитектурное правило CLAUDE.md: он не
// в курсе редактора), поэтому все эти взаимодействия нельзя повесить на её же SVG-узел.
import type { CutlineElement } from "../../model/document";
import type { HandlePos } from "../resizeElement";
import { HANDLE_SIZE, MIN_HIT_HEIGHT_PX } from "./constants";

function cursorForHandle(handle: HandlePos): string {
	if (handle.x !== 0.5 && handle.y !== 0.5) {
		return (handle.x === 0) === (handle.y === 0)
			? "nwse-resize"
			: "nesw-resize";
	}
	return handle.x === 0.5 ? "ns-resize" : "ew-resize";
}

const HANDLE_POSITIONS: HandlePos[] = [
	{ x: 0, y: 0 },
	{ x: 0.5, y: 0 },
	{ x: 1, y: 0 },
	{ x: 0, y: 0.5 },
	{ x: 1, y: 0.5 },
	{ x: 0, y: 1 },
	{ x: 0.5, y: 1 },
	{ x: 1, y: 1 },
];

export interface ElementOverlayProps {
	el: CutlineElement;
	pxPerMm: number;
	selected: boolean;
	canDrag: boolean;
	onSelect: () => void;
	onStartMove: (e: React.MouseEvent) => void;
	onStartResize: (handle: HandlePos, e: React.MouseEvent) => void;
}

export function ElementOverlay({
	el,
	pxPerMm,
	selected,
	canDrag,
	onSelect,
	onStartMove,
	onStartResize,
}: ElementOverlayProps) {
	if (!el.visible) {
		return null;
	}
	const widthPx = el.w * pxPerMm;
	const naturalHeightPx = el.h * pxPerMm;
	// у линии нулевая высота в модели — даём оверлею минимальную толщину хитбокса
	const heightPx = Math.max(
		naturalHeightPx,
		el.h === 0 ? MIN_HIT_HEIGHT_PX : 0,
	);
	const hitBoxTopAdjust = (heightPx - naturalHeightPx) / 2;

	return (
		// Хит-таргет элемента на холсте, не отдельный фокусируемый контрол — как и в LayerRow,
		// клавиатурная навигация по элементам принадлежит списку слоёв (там уже есть role="option").
		// biome-ignore lint/a11y/noStaticElementInteractions: см. комментарий выше
		// biome-ignore lint/a11y/useKeyWithClickEvents: см. комментарий выше
		<div
			onMouseDown={(e) => {
				onSelect();
				if (canDrag) onStartMove(e);
			}}
			// клик тоже долетел бы до canvas-card (место/снять выделение) — гасим здесь,
			// само выделение уже случилось на mousedown выше
			onClick={(e) => e.stopPropagation()}
			style={{
				position: "absolute",
				left: el.x * pxPerMm,
				top: el.y * pxPerMm - hitBoxTopAdjust,
				width: widthPx,
				height: heightPx,
				cursor: canDrag ? "move" : "pointer",
				transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
				transformOrigin: "center",
			}}
		>
			{selected && !el.locked && (
				<>
					<div
						style={{
							position: "absolute",
							inset: 0,
							outline: "1px solid var(--border-focus)",
							pointerEvents: "none",
						}}
					/>
					{HANDLE_POSITIONS.map((handle) => (
						// Маркер ресайза, тот же случай, что и хит-таргет элемента выше — не контрол,
						// клавиатурного пути к ресайзу пока нет нигде в редакторе (горячие клавиши — отдельный пункт роадмапа)
						// biome-ignore lint/a11y/noStaticElementInteractions: см. комментарий выше
						<div
							key={`${handle.x}-${handle.y}`}
							onMouseDown={(e) => {
								if (!canDrag) return;
								e.stopPropagation();
								onStartResize(handle, e);
							}}
							style={{
								position: "absolute",
								left: handle.x * widthPx - HANDLE_SIZE / 2,
								top: handle.y * heightPx - HANDLE_SIZE / 2,
								width: HANDLE_SIZE,
								height: HANDLE_SIZE,
								background: "#FFFFFF",
								border: "1px solid var(--border-focus)",
								cursor: canDrag ? cursorForHandle(handle) : "default",
								pointerEvents: canDrag ? "auto" : "none",
							}}
						/>
					))}
					<div
						style={{
							position: "absolute",
							top: heightPx + 4,
							left: "50%",
							transform: "translateX(-50%)",
							whiteSpace: "nowrap",
							font: "var(--type-label)",
							color: "var(--fg-accent)",
							pointerEvents: "none",
						}}
					>
						{Math.round(el.w)}×{Math.round(el.h)} мм
					</div>
				</>
			)}
		</div>
	);
}
