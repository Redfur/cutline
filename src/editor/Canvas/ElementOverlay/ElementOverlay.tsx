// Один div-оверлей на элемент документа — по нему выделяют, двигают и ресайзят. render()
// рисует карточку одним непрозрачным SVG-блобом (архитектурное правило CLAUDE.md: он не
// в курсе редактора), поэтому все эти взаимодействия нельзя повесить на её же SVG-узел.
import type { CutlineElement } from "../../../model/document";
import { boundsOf, lineLength } from "../../lib/geometry";
import type { HandlePos, LineEnd } from "../../lib/resizeElement";
import { HANDLE_SIZE, MIN_HIT_HEIGHT_PX } from "../constants";
import styles from "./ElementOverlay.module.css";

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
	// текст не влез на текущей записи — обводим предупреждающим цветом (ui-spec,
	// состояние «Текст не влез»)
	overflow: boolean;
	canDrag: boolean;
	onSelect: () => void;
	onStartMove: (e: React.MouseEvent) => void;
	onStartResize: (handle: HandlePos, e: React.MouseEvent) => void;
	onStartLineEnd: (end: LineEnd, e: React.MouseEvent) => void;
}

export function ElementOverlay({
	el,
	pxPerMm,
	selected,
	overflow,
	canDrag,
	onSelect,
	onStartMove,
	onStartResize,
	onStartLineEnd,
}: ElementOverlayProps) {
	if (!el.visible) {
		return null;
	}
	const isLine = el.type === "line";
	// у линии w/h — вектор и может быть отрицательным, коробку берём нормализованную
	const bounds = boundsOf(el);
	const naturalWidthPx = bounds.w * pxPerMm;
	const naturalHeightPx = bounds.h * pxPerMm;
	// горизонтальная или вертикальная линия — нулевая по одной оси: без минимальной
	// толщины хитбокса её не ухватить мышью
	const widthPx = Math.max(naturalWidthPx, isLine ? MIN_HIT_HEIGHT_PX : 0);
	const heightPx = Math.max(naturalHeightPx, isLine ? MIN_HIT_HEIGHT_PX : 0);
	const padX = (widthPx - naturalWidthPx) / 2;
	const padY = (heightPx - naturalHeightPx) / 2;
	// концы линии в координатах оверлея
	const lineEnds: { end: LineEnd; x: number; y: number }[] = isLine
		? [
				{
					end: "start",
					x: (el.x - bounds.x) * pxPerMm + padX,
					y: (el.y - bounds.y) * pxPerMm + padY,
				},
				{
					end: "end",
					x: (el.x + el.w - bounds.x) * pxPerMm + padX,
					y: (el.y + el.h - bounds.y) * pxPerMm + padY,
				},
			]
		: [];

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
			// клик тоже долетел бы до карточки (место/снять выделение) — гасим здесь,
			// само выделение уже случилось на mousedown выше
			onClick={(e) => e.stopPropagation()}
			className={`${styles.overlay} ${canDrag ? styles.draggable : ""}`}
			style={{
				left: bounds.x * pxPerMm - padX,
				top: bounds.y * pxPerMm - padY,
				width: widthPx,
				height: heightPx,
				transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
			}}
		>
			{overflow && <div className={styles.overflow} />}
			{selected && !el.locked && isLine && (
				<>
					{/* рамка по коробке у диагональной линии выглядела бы чужой —
					    выделение рисуем самой линией */}
					<svg className={styles.lineOutline} aria-hidden="true">
						<line
							x1={lineEnds[0]?.x}
							y1={lineEnds[0]?.y}
							x2={lineEnds[1]?.x}
							y2={lineEnds[1]?.y}
						/>
					</svg>
					{lineEnds.map(({ end, x, y }) => (
						// Маркер конца линии — тот же случай, что и маркеры ресайза ниже
						// biome-ignore lint/a11y/noStaticElementInteractions: см. комментарий ниже
						<div
							key={end}
							onMouseDown={(e) => {
								if (!canDrag) return;
								e.stopPropagation();
								onStartLineEnd(end, e);
							}}
							className={`${styles.handle} ${styles.lineHandle}`}
							style={{ left: x - HANDLE_SIZE / 2, top: y - HANDLE_SIZE / 2 }}
						/>
					))}
					<div className={styles.sizeLabel} style={{ top: heightPx + 4 }}>
						{Math.round(lineLength(el))} мм
					</div>
				</>
			)}
			{selected && !el.locked && !isLine && (
				<>
					<div className={styles.outline} />
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
							className={styles.handle}
							style={{
								left: handle.x * widthPx - HANDLE_SIZE / 2,
								top: handle.y * heightPx - HANDLE_SIZE / 2,
								// курсор зависит от маркера — восемь классов ради этого не заводим
								cursor: canDrag ? cursorForHandle(handle) : undefined,
							}}
						/>
					))}
					<div className={styles.sizeLabel} style={{ top: heightPx + 4 }}>
						{Math.round(el.w)}×{Math.round(el.h)} мм
					</div>
				</>
			)}
		</div>
	);
}
