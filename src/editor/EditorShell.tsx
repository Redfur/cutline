// Раскладка «Общей оболочки» + «Экрана 1. Режим дизайна» из docs/ui-spec.md, на пустом
// документе (blankDocument). Выделения и добавления элементов ещё нет — инспектор
// всегда показывает свойства холста, список слоёв всегда пуст. Следующие срезы
// достраивают сюда выделение/перетаскивание/добавление элементов поверх этого каркаса.
import { useState } from "react";
import type { CutlineDocument } from "../model/document";
import { blankDocument } from "../render/fixtures/blank";
import { BASE_PX_PER_MM, Canvas, type ViewportSize } from "./Canvas";
import { Inspector } from "./Inspector";
import { LayersPanel } from "./LayersPanel";
import { type Tool, Toolbar } from "./Toolbar";
import { type Mode, TopBar } from "./TopBar";
import { useDocumentHistory } from "./useDocumentHistory";

const FIT_MARGIN_PX = 32;

export function EditorShell() {
	const history = useDocumentHistory(blankDocument);
	const [mode, setMode] = useState<Mode>("design");
	const [tool, setTool] = useState<Tool>("select");
	const [zoom, setZoom] = useState(1);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [viewportSize, setViewportSize] = useState<ViewportSize | null>(null);

	const handleFitToWindow = () => {
		if (!viewportSize) return;
		const { canvas } = history.doc;
		const fitZoom = Math.min(
			(viewportSize.width - FIT_MARGIN_PX * 2) / (canvas.w * BASE_PX_PER_MM),
			(viewportSize.height - FIT_MARGIN_PX * 2) / (canvas.h * BASE_PX_PER_MM),
		);
		setZoom(Math.max(0.1, fitZoom));
	};

	const handleOpenDocument = (doc: CutlineDocument) => {
		history.set(() => doc);
		setSelectedId(null);
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
			<TopBar
				doc={history.doc}
				mode={mode}
				onModeChange={setMode}
				onOpenDocument={handleOpenDocument}
			/>
			{mode === "data" ? (
				<div
					style={{
						flex: 1,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "var(--fg-3)",
						font: "var(--type-body)",
					}}
				>
					Режим «Данные» — Этап 3 роадмапа, ещё не реализован.
				</div>
			) : (
				<div style={{ flex: 1, display: "flex", minHeight: 0 }}>
					<Toolbar
						tool={tool}
						onToolChange={setTool}
						zoom={zoom}
						onZoomChange={setZoom}
						onFitToWindow={handleFitToWindow}
					/>
					<LayersPanel
						elements={history.doc.elements}
						selectedId={selectedId}
						onSelect={setSelectedId}
					/>
					<Canvas
						doc={history.doc}
						zoom={zoom}
						onViewportResize={setViewportSize}
					/>
					<Inspector
						canvas={history.doc.canvas}
						onChange={(canvas) => history.set((doc) => ({ ...doc, canvas }))}
					/>
				</div>
			)}
		</div>
	);
}
