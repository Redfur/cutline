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
	// маркеры резайза и концов линии — только у единственного выделенного; в группе
	// у каждого только рамка
	handles: boolean;
	// текст не влез на текущей записи — обводим предупреждающим цветом (ui-spec,
	// состояние «Текст не влез»)
	overflow: boolean;
	// элемент целиком за обрезом — от него на холсте только полупрозрачный «призрак»,
	// пунктир показывает, где он
	offCard: boolean;
	// false — выбран инструмент размещения: оверлей видно (выделение, переполнение),
	// но мышь он пропускает к холсту, чтобы новый элемент можно было начать поверх
	interactive: boolean;
	canDrag: boolean;
	// нажатие на элемент: выделение (с Shift — переключить) и перетаскивание решает Canvas
	onPress: (e: React.MouseEvent) => void;
	onStartResize: (handle: HandlePos, e: React.MouseEvent) => void;
	onStartLineEnd: (end: LineEnd, e: React.MouseEvent) => void;
}

export function ElementOverlay({
	el,
	pxPerMm,
	selected,
	handles,
	overflow,
	offCard,
	interactive,
	canDrag,
	onPress,
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

	const handleMouseDown = (e: React.MouseEvent) => {
		// иначе нажатие дошло бы до области холста и начало рамку выделения
		e.stopPropagation();
		onPress(e);
	};

	return (
		// Хит-таргет элемента на холсте, не отдельный фокусируемый контрол — как и в LayerRow,
		// клавиатурная навигация по элементам принадлежит списку слоёв (там уже есть role="option").
		// biome-ignore lint/a11y/noStaticElementInteractions: см. комментарий выше
		// biome-ignore lint/a11y/useKeyWithClickEvents: см. комментарий выше
		<div
			// у линии мышь ловит сама линия (ниже), а не коробка: у диагональной линии
			// коробка накрывала бы чужие элементы — клик мимо линии выделял бы её
			onMouseDown={isLine ? undefined : handleMouseDown}
			// клик тоже долетел бы до карточки (место/снять выделение) — гасим здесь,
			// само выделение уже случилось на mousedown выше
			onClick={(e) => e.stopPropagation()}
			className={`${styles.overlay} ${isLine ? styles.lineBox : ""} ${canDrag ? styles.draggable : ""} ${interactive ? "" : styles.passive}`}
			style={{
				left: bounds.x * pxPerMm - padX,
				top: bounds.y * pxPerMm - padY,
				width: widthPx,
				height: heightPx,
				transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
			}}
		>
			{offCard && <div className={styles.offCard} />}
			{overflow && <div className={styles.overflow} />}
			{isLine && (
				<svg className={styles.lineHitArea} aria-hidden="true">
					{/* Хит-таргет линии — прозрачная обводка шириной MIN_HIT_HEIGHT_PX; тот же
					    случай, что и хит-таргет элемента выше, не отдельный контрол */}
					{/* biome-ignore lint/a11y/noStaticElementInteractions: см. комментарий выше */}
					<line
						className={styles.lineHit}
						x1={lineEnds[0]?.x}
						y1={lineEnds[0]?.y}
						x2={lineEnds[1]?.x}
						y2={lineEnds[1]?.y}
						strokeWidth={MIN_HIT_HEIGHT_PX}
						onMouseDown={handleMouseDown}
					/>
				</svg>
			)}
			{selected && isLine && (!handles || el.locked) && (
				<svg className={styles.lineOutline} aria-hidden="true">
					<line
						x1={lineEnds[0]?.x}
						y1={lineEnds[0]?.y}
						x2={lineEnds[1]?.x}
						y2={lineEnds[1]?.y}
					/>
				</svg>
			)}
			{selected && !isLine && (!handles || el.locked) && (
				<div className={styles.outline} />
			)}
			{selected && handles && !el.locked && isLine && (
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
			{selected && handles && !el.locked && !isLine && (
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
