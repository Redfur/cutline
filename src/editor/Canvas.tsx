// Единственное место перевода мм → px в проекте (архитектурное правило CLAUDE.md).
// Сама карточка рисуется через render() — тот же путь, что и экспорт, поэтому холст
// не может разойтись с тем, что попадёт в файл. Линейки, обрез/вылет/безопасное поле —
// поверх, отдельными слоями; render() как был, так и остаётся не в курсе редактора.
import { useEffect, useRef, useState } from "react";
import type { CutlineDocument } from "../model/document";
import { render } from "../render/render";

const BASE_PX_PER_MM = 96 / 25.4; // 100% зума = «настоящий» CSS-пиксель при 96dpi
const RULER_SIZE = 20; // px, совпадает с --ruler-size
const PAD_MM = 20; // запас вокруг карточки, чтобы вылет и линейки было видно при любом zoom
const MAJOR_TICK_MM = 10;
const MINOR_TICK_MM = 5;

export interface ViewportSize {
	width: number;
	height: number;
}

export interface CanvasProps {
	doc: CutlineDocument;
	zoom: number;
	onViewportResize?: (size: ViewportSize) => void;
}

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

export function Canvas({ doc, zoom, onViewportResize }: CanvasProps) {
	const viewportRef = useRef<HTMLDivElement>(null);
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

	// докручиваем до центра только когда контент больше вьюпорта — иначе он уже точно
	// по центру за счёт contentWidthPx === viewport.width выше
	useEffect(() => {
		const el = viewportRef.current;
		if (!el) return;
		el.scrollLeft = Math.max(0, (contentWidthPx - el.clientWidth) / 2);
		el.scrollTop = Math.max(0, (contentHeightPx - el.clientHeight) / 2);
	}, [contentWidthPx, contentHeightPx]);

	const cardSvg = render(
		doc,
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
						<div
							className="canvas-card"
							style={{
								position: "absolute",
								left: originXPx,
								top: originYPx,
								width: cardWidthPx,
								height: cardHeightPx,
								boxShadow: "var(--shadow-card)",
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
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export { BASE_PX_PER_MM, PAD_MM };
