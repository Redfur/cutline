// Раскладка «Общей оболочки» + «Экрана 1. Режим дизайна» из docs/ui-spec.md.
// Добавление фигур (rect/ellipse/line), выделение и удаление — этот срез;
// text/image, перетаскивание/resize, привязки, остальные горячие клавиши — ещё нет.
import { useEffect, useState } from "react";
import type { CutlineDocument, CutlineElement } from "../model/document";
import { blankDocument } from "../render/fixtures/blank";
import {
	BASE_PX_PER_MM,
	Canvas,
	type PointMm,
	type ViewportSize,
} from "./Canvas";
import {
	createEllipse,
	createLine,
	createRect,
	createText,
} from "./createElement";
import { Inspector } from "./Inspector";
import { LayersPanel } from "./LayersPanel";
import { type Tool, Toolbar } from "./Toolbar";
import { type Mode, TopBar } from "./TopBar";
import { useDocumentHistory } from "./useDocumentHistory";

const FIT_MARGIN_PX = 32;

function isTextEntryTarget(el: EventTarget | null): boolean {
	if (!(el instanceof HTMLElement)) return false;
	return (
		el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable
	);
}

export function EditorShell() {
	const history = useDocumentHistory(blankDocument);
	const [mode, setMode] = useState<Mode>("design");
	const [tool, setTool] = useState<Tool>("select");
	const [zoom, setZoom] = useState(1);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [viewportSize, setViewportSize] = useState<ViewportSize | null>(null);

	const selectedElement =
		history.doc.elements.find((el) => el.id === selectedId) ?? null;

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
		history.set(() => doc, { boundary: true });
		setSelectedId(null);
	};

	const handlePlace = (at: PointMm) => {
		const factory = {
			rect: createRect,
			ellipse: createEllipse,
			line: createLine,
			text: createText,
		}[tool as "rect" | "ellipse" | "line" | "text"];
		if (!factory) return;
		const element = factory(at);
		// boundary: без него быстрая печать сразу после добавления могла бы смёржиться
		// с созданием элемента в один шаг истории — один Ctrl+Z снёс бы и то, и другое
		history.set((doc) => ({ ...doc, elements: [...doc.elements, element] }), {
			boundary: true,
		});
		setSelectedId(element.id);
		setTool("select");
	};

	const handleElementChange = (updated: CutlineElement) => {
		history.set((doc) => ({
			...doc,
			elements: doc.elements.map((el) => (el.id === updated.id ? updated : el)),
		}));
	};

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			const mod = e.metaKey || e.ctrlKey;
			const key = e.key.toLowerCase();

			// Undo/redo — намеренно без проверки на фокус в поле ввода: у нас свой
			// полноценный document-level undo, он главнее нативного undo браузера
			// внутри <input> (preventDefault глушит нативный, чтобы они не мешали друг другу).
			if (mod && key === "z" && !e.shiftKey) {
				e.preventDefault();
				history.undo();
				return;
			}
			if (mod && ((key === "z" && e.shiftKey) || key === "y")) {
				e.preventDefault();
				history.redo();
				return;
			}

			// Delete/Backspace удаляют выделенный элемент — но не когда фокус в поле
			// инспектора, иначе Backspace при правке текста стирал бы элемент с холста,
			// а не символ в поле.
			if (e.key !== "Delete" && e.key !== "Backspace") return;
			if (isTextEntryTarget(document.activeElement)) return;
			if (!selectedId) return;
			e.preventDefault();
			history.set(
				(doc) => ({
					...doc,
					elements: doc.elements.filter((el) => el.id !== selectedId),
				}),
				{ boundary: true },
			);
			setSelectedId(null);
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [selectedId, history.set, history.undo, history.redo]);

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
			<TopBar
				doc={history.doc}
				mode={mode}
				onModeChange={setMode}
				onOpenDocument={handleOpenDocument}
				canUndo={history.canUndo}
				canRedo={history.canRedo}
				onUndo={history.undo}
				onRedo={history.redo}
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
						tool={tool}
						selectedId={selectedId}
						onSelect={setSelectedId}
						onPlace={handlePlace}
						onElementChange={handleElementChange}
						onViewportResize={setViewportSize}
					/>
					<Inspector
						canvas={history.doc.canvas}
						onCanvasChange={(canvas) =>
							history.set((doc) => ({ ...doc, canvas }))
						}
						selectedElement={selectedElement}
						onElementChange={handleElementChange}
					/>
				</div>
			)}
		</div>
	);
}
