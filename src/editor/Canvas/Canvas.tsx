// Здесь — единственное место перевода мм → px в проекте (архитектурное правило CLAUDE.md):
// pxPerMm считается только в этом компоненте из BASE_PX_PER_MM (constants.ts) и зума,
// подкомпоненты папки Canvas/ получают его пропом. Сама карточка рисуется через
// render() — тот же путь, что и экспорт, поэтому холст не может разойтись с тем, что
// попадёт в файл. Линейки, обрез/вылет/безопасное поле — поверх, отдельными слоями;
// render() как был, так и остаётся не в курсе редактора.
import { type ReactNode, useEffect, useRef, useState } from "react";
import type {
	CutlineDocument,
	CutlineElement,
	DataRecord,
	Guide,
} from "../../model/document";
import { render } from "../../render/render";
import type { Tool } from "../Toolbar";
import styles from "./Canvas.module.css";
import { BASE_PX_PER_MM, PAD_MM } from "./constants";
import { ElementOverlay } from "./ElementOverlay";
import { GuideLine } from "./GuideLine";
import { Ruler } from "./Ruler";
import { useElementDrag } from "./useElementDrag";
import { useGuideDrag } from "./useGuideDrag";

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
	// запись, которой заполняются плейсхолдеры на карточке; выбирает её оболочка
	record: DataRecord;
	// плавающая полоса внизу холста (навигатор записей) — не прокручивается с карточкой
	bottomBar?: ReactNode;
	zoom: number;
	tool: Tool;
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	onPlace: (at: PointMm) => void;
	onElementChange: (element: CutlineElement) => void;
	onGuidesChange: (guides: Guide[], options?: { boundary?: boolean }) => void;
	selectedGuideId: string | null;
	onSelectGuide: (id: string | null) => void;
	onViewportResize?: (size: ViewportSize) => void;
}

const PLACEABLE_TOOLS = new Set<Tool>([
	"rect",
	"ellipse",
	"line",
	"text",
	"image",
]);

export function Canvas({
	doc,
	record,
	bottomBar,
	zoom,
	tool,
	selectedId,
	onSelect,
	onPlace,
	onElementChange,
	onGuidesChange,
	selectedGuideId,
	onSelectGuide,
	onViewportResize,
}: CanvasProps) {
	const viewportRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const rulerXStripRef = useRef<HTMLDivElement>(null);
	const rulerYStripRef = useRef<HTMLDivElement>(null);
	const [scroll, setScroll] = useState({ left: 0, top: 0 });
	const [viewport, setViewport] = useState<ViewportSize | null>(null);

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
	const xGuideMarks = doc.guides
		.filter((g) => g.axis === "x")
		.map((g) => g.positionMm);
	const yGuideMarks = doc.guides
		.filter((g) => g.axis === "y")
		.map((g) => g.positionMm);

	// докручиваем до центра только когда контент больше вьюпорта — иначе он уже точно
	// по центру за счёт contentWidthPx === viewport.width выше
	useEffect(() => {
		const el = viewportRef.current;
		if (!el) return;
		el.scrollLeft = Math.max(0, (contentWidthPx - el.clientWidth) / 2);
		el.scrollTop = Math.max(0, (contentHeightPx - el.clientHeight) / 2);
	}, [contentWidthPx, contentHeightPx]);

	const { liveElement, snapGuides, startMove, startResize } = useElementDrag({
		doc,
		pxPerMm,
		onElementChange,
	});
	const { guideDrag, liveGuideMm, startNewGuide, startMoveGuide } =
		useGuideDrag({
			guides: doc.guides,
			pxPerMm,
			originXPx,
			originYPx,
			contentRef,
			rulerXStripRef,
			rulerYStripRef,
			onGuidesChange,
			onSelectGuide,
		});

	const elements = liveElement
		? doc.elements.map((el) => (el.id === liveElement.id ? liveElement : el))
		: doc.elements;
	const effectiveDoc = liveElement ? { ...doc, elements } : doc;

	const cardSvg = render(effectiveDoc, record, {
		outlines: false,
		bleed: false,
		marks: false,
	});

	return (
		<div className={styles.root}>
			<div className={styles.topRow}>
				<div className={styles.corner} />
				{/* Тянет новую направляющую на холст, как в Фигме — не семантический
				    контрол, клавиатурного эквивалента нет, как и у самого холста ниже */}
				{/* biome-ignore lint/a11y/noStaticElementInteractions: см. комментарий выше */}
				<div
					ref={rulerXStripRef}
					onMouseDown={(e) => {
						e.preventDefault();
						startNewGuide("x");
					}}
					className={`${styles.rulerStrip} ${styles.rulerStripX}`}
				>
					<Ruler
						axis="x"
						lengthMm={canvas.w}
						pxPerMm={pxPerMm}
						offsetPx={scroll.left}
						originPx={originXPx}
						highlightRange={
							liveElement
								? { fromMm: liveElement.x, toMm: liveElement.x + liveElement.w }
								: null
						}
						guideMarks={xGuideMarks}
					/>
				</div>
			</div>
			<div className={styles.body}>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: тянет новую направляющую, см. комментарий у горизонтальной линейки выше */}
				<div
					ref={rulerYStripRef}
					onMouseDown={(e) => {
						e.preventDefault();
						startNewGuide("y");
					}}
					className={`${styles.rulerStrip} ${styles.rulerStripY}`}
				>
					<Ruler
						axis="y"
						lengthMm={canvas.h}
						pxPerMm={pxPerMm}
						offsetPx={scroll.top}
						originPx={originYPx}
						highlightRange={
							liveElement
								? { fromMm: liveElement.y, toMm: liveElement.y + liveElement.h }
								: null
						}
						guideMarks={yGuideMarks}
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
					className={styles.viewport}
				>
					{/* Серая область вокруг карточки — клик здесь снимает выделение, как клик по
					    самой карточке мимо элементов; карточка гасит свой click ниже,
					    чтобы не сработать здесь же ещё раз всплытием */}
					{/* biome-ignore lint/a11y/noStaticElementInteractions: см. комментарий выше */}
					{/* biome-ignore lint/a11y/useKeyWithClickEvents: см. комментарий выше */}
					<div
						ref={contentRef}
						onClick={() => onSelect(null)}
						className={styles.content}
						style={{ width: contentWidthPx, height: contentHeightPx }}
					>
						{/* Кликабельная поверхность холста — размещение/снятие выделения по координате клика,
						    не семантический контрол; клавиатурного эквивалента здесь нет, как и у canvas */}
						{/* biome-ignore lint/a11y/noStaticElementInteractions: см. комментарий выше */}
						{/* biome-ignore lint/a11y/useKeyWithClickEvents: см. комментарий выше */}
						<div
							className={`${styles.card} ${PLACEABLE_TOOLS.has(tool) ? styles.placing : ""}`}
							onClick={(e) => {
								// иначе всплыл бы на серую область выше и снял выделение сразу
								// после размещения нового элемента этим же кликом
								e.stopPropagation();
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
								left: originXPx,
								top: originYPx,
								width: cardWidthPx,
								height: cardHeightPx,
							}}
						>
							<div
								className={styles.cardArt}
								// biome-ignore lint/security/noDangerouslySetInnerHtml: render() выдаёт доверенный SVG из собственного документа редактора
								dangerouslySetInnerHTML={{ __html: cardSvg }}
							/>
							<div className={styles.trim} />
							<div className={styles.bleed} style={{ inset: -bleedPx }} />
							<div className={styles.safe} style={{ inset: safePx }} />
							{snapGuides.map((guide) => (
								<div
									key={`${guide.axis}-${guide.positionMm}`}
									className={`${styles.snapGuide} ${guide.axis === "x" ? styles.snapGuideX : styles.snapGuideY}`}
									style={
										guide.axis === "x"
											? { left: guide.positionMm * pxPerMm }
											: { top: guide.positionMm * pxPerMm }
									}
								/>
							))}
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
										startMove(el, e);
									}}
									onStartResize={(handle, e) => {
										e.preventDefault();
										startResize(el, handle, e);
									}}
								/>
							))}
						</div>
					</div>
					{/* Направляющие рисуются во всю область редактора (не обрезаются по карточке),
					    поэтому это сосед карточки внутри contentRef, а не её потомок — позиция
					    считается от originXPx/originYPx, той же точки мм=0, что и у самой карточки */}
					{doc.guides
						.filter((g) => g.id !== guideDrag?.id)
						.map((guide) => (
							<GuideLine
								key={guide.id}
								axis={guide.axis}
								positionMm={guide.positionMm}
								pxPerMm={pxPerMm}
								originPx={guide.axis === "x" ? originXPx : originYPx}
								selected={guide.id === selectedGuideId}
								onMouseDown={(e) => {
									e.preventDefault();
									e.stopPropagation();
									onSelectGuide(guide.id);
									startMoveGuide(guide);
								}}
							/>
						))}
					{guideDrag && liveGuideMm !== null && (
						<GuideLine
							axis={guideDrag.axis}
							positionMm={liveGuideMm}
							pxPerMm={pxPerMm}
							originPx={guideDrag.axis === "x" ? originXPx : originYPx}
						/>
					)}
				</div>
				{bottomBar && <div className={styles.bottomBar}>{bottomBar}</div>}
			</div>
		</div>
	);
}
