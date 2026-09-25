// Единственное место перевода мм → px в проекте (архитектурное правило CLAUDE.md).
// Сама карточка рисуется через render() — тот же путь, что и экспорт, поэтому холст
// не может разойтись с тем, что попадёт в файл. Линейки, обрез/вылет/безопасное поле —
// поверх, отдельными слоями; render() как был, так и остаётся не в курсе редактора.
import { useEffect, useRef, useState } from "react";
import type { CutlineDocument, CutlineElement } from "../model/document";
import { render } from "../render/render";
import { type HandlePos, moveElement, resizeElement } from "./resizeElement";
import type { Tool } from "./Toolbar";

const BASE_PX_PER_MM = 96 / 25.4; // 100% зума = «настоящий» CSS-пиксель при 96dpi
const RULER_SIZE = 20; // px, совпадает с --ruler-size
const PAD_MM = 20; // запас вокруг карточки, чтобы вылет и линейки было видно при любом zoom
const MAJOR_TICK_MM = 10;
const MINOR_TICK_MM = 5;

export interface ViewportSize {
	width: number;
	height: number;
}

export interface PointMm {
	x: number;
	y: number;
}

export interface CanvasProps {
	doc: CutlineDocument;
	zoom: number;
	tool: Tool;
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	onPlace: (at: PointMm) => void;
	onElementChange: (element: CutlineElement) => void;
	onViewportResize?: (size: ViewportSize) => void;
}

const PLACEABLE_TOOLS = new Set<Tool>(["rect", "ellipse", "line"]);

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

const HANDLE_SIZE = 7;
// у линии нулевая высота в модели — даём оверлею минимальную толщину хитбокса, иначе некликабельна
const MIN_HIT_HEIGHT_PX = 8;

function ticksInRange(fromMm: number, toMm: number, stepMm: number): number[] {
	const start = Math.ceil(fromMm / stepMm) * stepMm;
	const out: number[] = [];
	for (let mm = start; mm <= toMm; mm += stepMm) {
		out.push(mm);
	}
	return out;
}

function Ruler({
	axis,
	lengthMm,
	pxPerMm,
	offsetPx,
	originPx,
}: {
	axis: "x" | "y";
	lengthMm: number;
	pxPerMm: number;
	offsetPx: number;
	originPx: number;
}) {
	const from = -PAD_MM;
	const to = lengthMm + PAD_MM;
	const major = ticksInRange(from, to, MAJOR_TICK_MM);
	const minor = ticksInRange(from, to, MINOR_TICK_MM).filter(
		(mm) => mm % MAJOR_TICK_MM !== 0,
	);

	return (
		<div
			style={{
				position: "absolute",
				...(axis === "x"
					? { left: -offsetPx, top: 0, height: "100%" }
					: { top: -offsetPx, left: 0, width: "100%" }),
			}}
		>
			{minor.map((mm) => {
				const posPx = originPx + mm * pxPerMm;
				return (
					<div
						key={mm}
						style={{
							position: "absolute",
							background: "var(--border-2)",
							...(axis === "x"
								? { left: posPx, top: RULER_SIZE - 5, width: 1, height: 5 }
								: { top: posPx, left: RULER_SIZE - 5, height: 1, width: 5 }),
						}}
					/>
				);
			})}
			{major.map((mm) => {
				const posPx = originPx + mm * pxPerMm;
				return (
					<div
						key={mm}
						style={{
							position: "absolute",
							...(axis === "x"
								? { left: posPx, top: 0, width: 1, height: RULER_SIZE }
								: { top: posPx, left: 0, height: 1, width: RULER_SIZE }),
							background: "var(--border-2)",
						}}
					>
						<span
							style={{
								position: "absolute",
								font: "var(--type-label)",
								color: "var(--fg-3)",
								...(axis === "x" ? { left: 3, top: 1 } : { top: 3, left: 2 }),
							}}
						>
							{mm}
						</span>
					</div>
				);
			})}
		</div>
	);
}

// Один div-оверлей на элемент документа — по нему выделяют, двигают и ресайзят. render()
// рисует карточку одним непрозрачным SVG-блобом (архитектурное правило CLAUDE.md: он не
// в курсе редактора), поэтому все эти взаимодействия нельзя повесить на её же SVG-узел.
function ElementOverlay({
	el,
	pxPerMm,
	selected,
	canDrag,
	onSelect,
	onStartMove,
	onStartResize,
}: {
	el: CutlineElement;
	pxPerMm: number;
	selected: boolean;
	canDrag: boolean;
	onSelect: () => void;
	onStartMove: (e: React.MouseEvent) => void;
	onStartResize: (handle: HandlePos, e: React.MouseEvent) => void;
}) {
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

interface DragState {
	kind: "move" | "resize";
	handle?: HandlePos;
	startClientX: number;
	startClientY: number;
	startElement: CutlineElement;
}

export function Canvas({
	doc,
	zoom,
	tool,
	selectedId,
	onSelect,
	onPlace,
	onElementChange,
	onViewportResize,
}: CanvasProps) {
	const viewportRef = useRef<HTMLDivElement>(null);
	const [scroll, setScroll] = useState({ left: 0, top: 0 });
	const [viewport, setViewport] = useState<ViewportSize | null>(null);
	const [drag, setDrag] = useState<DragState | null>(null);
	const [liveElement, setLiveElement] = useState<CutlineElement | null>(null);
	const liveElementRef = useRef<CutlineElement | null>(null);

	useEffect(() => {
		const el = viewportRef.current;
		if (!el) {
			return;
		}
		const observer = new ResizeObserver(([entry]) => {
			if (!entry) return;
			const { width, height } = entry.contentRect;
			setViewport({ width, height });
			onViewportResize?.({ width, height });
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, [onViewportResize]);

	const { canvas } = doc;
	const pxPerMm = BASE_PX_PER_MM * zoom;
	const padPx = PAD_MM * pxPerMm;
	const cardWidthPx = canvas.w * pxPerMm;
	const cardHeightPx = canvas.h * pxPerMm;
	const bleedPx = canvas.bleed * pxPerMm;
	const safePx = canvas.safe * pxPerMm;
	const naturalWidthPx = cardWidthPx + padPx * 2;
	const naturalHeightPx = cardHeightPx + padPx * 2;
	// когда карточка с запасом меньше вьюпорта — область содержимого растягивается
	// до размера вьюпорта, и карточка центрируется в ней; когда больше — прокручивается как есть
	const contentWidthPx = Math.max(naturalWidthPx, viewport?.width ?? 0);
	const contentHeightPx = Math.max(naturalHeightPx, viewport?.height ?? 0);
	// originPx — где внутри области содержимого лежит мм-нулевая точка (угол обреза)
	const originXPx = (contentWidthPx - cardWidthPx) / 2;
	const originYPx = (contentHeightPx - cardHeightPx) / 2;

	// докручиваем до центра только когда контент больше вьюпорта — иначе он уже точно
	// по центру за счёт contentWidthPx === viewport.width выше
	useEffect(() => {
		const el = viewportRef.current;
		if (!el) return;
		el.scrollLeft = Math.max(0, (contentWidthPx - el.clientWidth) / 2);
		el.scrollTop = Math.max(0, (contentHeightPx - el.clientHeight) / 2);
	}, [contentWidthPx, contentHeightPx]);

	// Во время драга/resize документ в истории не трогаем (CLAUDE.md требует историю
	// с первого дня, а не по шагу на каждый mousemove) — только локальное live-превью
	// здесь, в Canvas; в историю уходит один onElementChange на mouseup с итогом.
	useEffect(() => {
		if (!drag) return;
		function handleMouseMove(e: MouseEvent) {
			if (!drag) return;
			const dxMm = (e.clientX - drag.startClientX) / pxPerMm;
			const dyMm = (e.clientY - drag.startClientY) / pxPerMm;
			const updated =
				drag.kind === "move"
					? moveElement(drag.startElement, dxMm, dyMm)
					: resizeElement(
							drag.startElement,
							drag.handle as HandlePos,
							dxMm,
							dyMm,
						);
			liveElementRef.current = updated;
			setLiveElement(updated);
		}
		function handleMouseUp() {
			if (liveElementRef.current) {
				onElementChange(liveElementRef.current);
			}
			liveElementRef.current = null;
			setLiveElement(null);
			setDrag(null);
		}
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [drag, pxPerMm, onElementChange]);

	const elements = liveElement
		? doc.elements.map((el) => (el.id === liveElement.id ? liveElement : el))
		: doc.elements;
	const effectiveDoc = liveElement ? { ...doc, elements } : doc;

	const cardSvg = render(
		effectiveDoc,
		{},
		{ outlines: false, bleed: false, marks: false },
	);

	return (
		<div
			style={{
				flex: 1,
				minWidth: 0,
				display: "flex",
				flexDirection: "column",
				background: "var(--bg-canvas)",
			}}
		>
			<div style={{ display: "flex", flex: "none", height: RULER_SIZE }}>
				<div
					style={{
						width: RULER_SIZE,
						flex: "none",
						background: "var(--bg-panel)",
						borderRight: "1px solid var(--border-1)",
						borderBottom: "1px solid var(--border-1)",
					}}
				/>
				<div
					style={{
						flex: 1,
						overflow: "hidden",
						position: "relative",
						background: "var(--bg-panel)",
						borderBottom: "1px solid var(--border-1)",
					}}
				>
					<Ruler
						axis="x"
						lengthMm={canvas.w}
						pxPerMm={pxPerMm}
						offsetPx={scroll.left}
						originPx={originXPx}
					/>
				</div>
			</div>
			<div style={{ display: "flex", flex: 1, minHeight: 0 }}>
				<div
					style={{
						width: RULER_SIZE,
						flex: "none",
						overflow: "hidden",
						position: "relative",
						background: "var(--bg-panel)",
						borderRight: "1px solid var(--border-1)",
					}}
				>
					<Ruler
						axis="y"
						lengthMm={canvas.h}
						pxPerMm={pxPerMm}
						offsetPx={scroll.top}
						originPx={originYPx}
					/>
				</div>
				<div
					ref={viewportRef}
					onScroll={(e) =>
						setScroll({
							left: e.currentTarget.scrollLeft,
							top: e.currentTarget.scrollTop,
						})
					}
					style={{ flex: 1, overflow: "auto", position: "relative" }}
				>
					<div
						style={{
							width: contentWidthPx,
							height: contentHeightPx,
							position: "relative",
						}}
					>
						{/* Кликабельная поверхность холста — размещение/снятие выделения по координате клика,
						    не семантический контрол; клавиатурного эквивалента здесь нет, как и у canvas */}
						{/* biome-ignore lint/a11y/noStaticElementInteractions: см. комментарий выше */}
						{/* biome-ignore lint/a11y/useKeyWithClickEvents: см. комментарий выше */}
						<div
							className="canvas-card"
							onClick={(e) => {
								const rect = e.currentTarget.getBoundingClientRect();
								const atMm = {
									x: (e.clientX - rect.left) / pxPerMm,
									y: (e.clientY - rect.top) / pxPerMm,
								};
								if (PLACEABLE_TOOLS.has(tool)) {
									onPlace(atMm);
								} else {
									onSelect(null);
								}
							}}
							style={{
								position: "absolute",
								left: originXPx,
								top: originYPx,
								width: cardWidthPx,
								height: cardHeightPx,
								boxShadow: "var(--shadow-card)",
								cursor: PLACEABLE_TOOLS.has(tool) ? "crosshair" : "default",
							}}
						>
							<div
								style={{ width: "100%", height: "100%" }}
								// biome-ignore lint/security/noDangerouslySetInnerHtml: render() выдаёт доверенный SVG из собственного документа редактора
								dangerouslySetInnerHTML={{ __html: cardSvg }}
							/>
							<div
								style={{
									position: "absolute",
									inset: 0,
									border: "1px solid var(--guide-trim)",
									pointerEvents: "none",
								}}
							/>
							<div
								style={{
									position: "absolute",
									left: -bleedPx,
									top: -bleedPx,
									right: -bleedPx,
									bottom: -bleedPx,
									border: "1px dashed var(--guide-bleed)",
									pointerEvents: "none",
								}}
							/>
							<div
								style={{
									position: "absolute",
									left: safePx,
									top: safePx,
									right: safePx,
									bottom: safePx,
									border: "1px dashed var(--guide-safe)",
									pointerEvents: "none",
								}}
							/>
							{elements.map((el) => (
								<ElementOverlay
									key={el.id}
									el={el}
									pxPerMm={pxPerMm}
									selected={el.id === selectedId}
									canDrag={tool === "select" && !el.locked}
									onSelect={() => onSelect(el.id)}
									onStartMove={(e) => {
										e.preventDefault();
										setDrag({
											kind: "move",
											startClientX: e.clientX,
											startClientY: e.clientY,
											startElement: el,
										});
									}}
									onStartResize={(handle, e) => {
										e.preventDefault();
										setDrag({
											kind: "resize",
											handle,
											startClientX: e.clientX,
											startClientY: e.clientY,
											startElement: el,
										});
									}}
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export { BASE_PX_PER_MM, PAD_MM };
