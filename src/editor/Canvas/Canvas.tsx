// Здесь — единственное место перевода мм → px в проекте (архитектурное правило CLAUDE.md):
// pxPerMm считается только в этом компоненте из BASE_PX_PER_MM (constants.ts) и зума,
// подкомпоненты папки Canvas/ получают его пропом. Сама карточка рисуется через
// render() — тот же путь, что и экспорт, поэтому холст не может разойтись с тем, что
// попадёт в файл. Линейки, обрез/вылет/безопасное поле — поверх, отдельными слоями;
// render() как был, так и остаётся не в курсе редактора.
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import type {
	CutlineDocument,
	CutlineElement,
	DataRecord,
	ElementType,
	Guide,
} from "../../model/document";
import { render } from "../../render/render";
import { boundsOf } from "../lib/geometry";
import type { BorderVisibility } from "../lib/snap";
import type { Tool } from "../Toolbar";
import styles from "./Canvas.module.css";
import { BASE_PX_PER_MM, PAD_MM } from "./constants";
import { ElementOverlay } from "./ElementOverlay";
import { GuideLine } from "./GuideLine";
import { Ruler } from "./Ruler";
import { useDrawElement } from "./useDrawElement";
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
	// id текстов, не влезших на этой записи
	overflowIds: string[];
	// плавающая полоса внизу холста (навигатор записей) — не прокручивается с карточкой
	bottomBar?: ReactNode;
	zoom: number;
	tool: Tool;
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	// готовый элемент от инструмента (клик или протягивание) — добавить в документ
	onCreate: (element: CutlineElement) => void;
	onElementChange: (
		element: CutlineElement,
		options?: { boundary?: boolean },
	) => void;
	onGuidesChange: (guides: Guide[], options?: { boundary?: boolean }) => void;
	selectedGuideId: string | null;
	onSelectGuide: (id: string | null) => void;
	onViewportResize?: (size: ViewportSize) => void;
	// какие границы холста показывать (галочки в инспекторе холста) — это вид, не документ
	borders: BorderVisibility;
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
	overflowIds,
	bottomBar,
	zoom,
	tool,
	selectedId,
	onSelect,
	onCreate,
	onElementChange,
	onGuidesChange,
	selectedGuideId,
	onSelectGuide,
	onViewportResize,
	borders,
}: CanvasProps) {
	const viewportRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const rulerXStripRef = useRef<HTMLDivElement>(null);
	const rulerYStripRef = useRef<HTMLDivElement>(null);
	const [scroll, setScroll] = useState({ left: 0, top: 0 });
	const [viewport, setViewport] = useState<ViewportSize | null>(null);

	// Layout-эффект и синхронный замер при монтировании: ResizeObserver отдаёт размер
	// только после первой отрисовки, и первый кадр шёл с viewport = null — карточка на
	// мгновение вставала не по центру. Так первый же отрисованный кадр — уже по центру.
	useLayoutEffect(() => {
		const el = viewportRef.current;
		if (!el) {
			return;
		}
		const initial = { width: el.clientWidth, height: el.clientHeight };
		setViewport(initial);
		onViewportResize?.(initial);
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
	// по центру за счёт contentWidthPx === viewport.width выше; layout-эффект — чтобы
	// прокрутка встала до отрисовки, а не кадром позже
	useLayoutEffect(() => {
		const el = viewportRef.current;
		if (!el) return;
		el.scrollLeft = Math.max(0, (contentWidthPx - el.clientWidth) / 2);
		el.scrollTop = Math.max(0, (contentHeightPx - el.clientHeight) / 2);
	}, [contentWidthPx, contentHeightPx]);

	const { liveElement, snapGuides, startMove, startResize, startLineEnd } =
		useElementDrag({
			doc,
			borders,
			pxPerMm,
			onElementChange,
		});
	// Пока выбран инструмент размещения, элементы и направляющие не ловят мышь:
	// иначе нажатие попадало в оверлей элемента под курсором (даже заблокированного —
	// на бейдже «Рамка карточки» накрывает карточку целиком), и создать поверх нельзя
	const placing = PLACEABLE_TOOLS.has(tool);
	const {
		draft,
		snapGuides: drawSnapGuides,
		startDraw,
	} = useDrawElement({
		doc,
		borders,
		pxPerMm,
		originXPx,
		originYPx,
		contentRef,
		onCreate,
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

	// у линии w/h — вектор, подсветке на линейках нужна нормализованная коробка
	const activeElement = liveElement ?? draft;
	const liveBounds = activeElement ? boundsOf(activeElement) : null;
	const elements = liveElement
		? doc.elements.map((el) => (el.id === liveElement.id ? liveElement : el))
		: doc.elements;
	// черновик рисуется тем же render(), что и готовый элемент, — поверх остальных,
	// как и ляжет после создания
	const renderedElements = draft ? [...elements, draft] : elements;
	const effectiveDoc =
		renderedElements === doc.elements
			? doc
			: { ...doc, elements: renderedElements };
	const guidesToShow = [...snapGuides, ...drawSnapGuides];
	const draftBounds = draft && draft.type !== "line" ? boundsOf(draft) : null;

	const cardSvg = render(effectiveDoc, record, {
		outlines: null,
		bleed: false,
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
							liveBounds
								? { fromMm: liveBounds.x, toMm: liveBounds.x + liveBounds.w }
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
							liveBounds
								? { fromMm: liveBounds.y, toMm: liveBounds.y + liveBounds.h }
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
						onMouseDown={(e) => {
							// рисовать можно и на вылете, не только на самой карточке
							if (!placing || e.button !== 0) return;
							e.preventDefault();
							startDraw(tool as ElementType, e);
						}}
						className={`${styles.content} ${placing ? styles.placing : ""}`}
						style={{ width: contentWidthPx, height: contentHeightPx }}
					>
						{/* Клик по карточке мимо элементов снимает выделение — как и по серой
							    области; размещение инструментом — на mousedown области содержимого
							    выше. Не семантический контрол, клавиатурного эквивалента нет, как у canvas */}
						{/* biome-ignore lint/a11y/noStaticElementInteractions: см. комментарий выше */}
						{/* biome-ignore lint/a11y/useKeyWithClickEvents: см. комментарий выше */}
						<div
							className={styles.card}
							onClick={(e) => {
								// иначе всплыл бы на серую область и снял выделение второй раз
								e.stopPropagation();
								onSelect(null);
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
							{borders.trim && <div className={styles.trim} />}
							{borders.bleed && (
								<div className={styles.bleed} style={{ inset: -bleedPx }} />
							)}
							{borders.safe && (
								<div className={styles.safe} style={{ inset: safePx }} />
							)}
							{draftBounds && (
								// у картинки без src render() ничего не рисует — без рамки
								// черновик изображения был бы невидим
								<div
									className={styles.draft}
									style={{
										left: draftBounds.x * pxPerMm,
										top: draftBounds.y * pxPerMm,
										width: draftBounds.w * pxPerMm,
										height: draftBounds.h * pxPerMm,
									}}
								/>
							)}
							{guidesToShow.map((guide) => (
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
									overflow={overflowIds.includes(el.id)}
									interactive={!placing}
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
									onStartLineEnd={(end, e) => {
										e.preventDefault();
										startLineEnd(el, end, e);
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
								onMouseDown={
									placing
										? undefined
										: (e) => {
												e.preventDefault();
												e.stopPropagation();
												onSelectGuide(guide.id);
												startMoveGuide(guide);
											}
								}
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
