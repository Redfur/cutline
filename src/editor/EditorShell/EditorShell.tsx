// Раскладка «Общей оболочки» + «Экрана 1. Режим дизайна» из docs/ui-spec.md.
// Добавление фигур (rect/ellipse/line), выделение и удаление — этот срез;
// text/image, перетаскивание/resize, привязки, остальные горячие клавиши — ещё нет.
import { useEffect, useState } from "react";
import type {
	CutlineDocument,
	CutlineElement,
	Guide,
} from "../../model/document";
import { blankDocument } from "../../render/fixtures/blank";
import {
	BASE_PX_PER_MM,
	Canvas,
	type PointMm,
	type ViewportSize,
} from "../Canvas/Canvas";
import {
	createEllipse,
	createImage,
	createLine,
	createRect,
	createText,
} from "../createElement";
import { Inspector } from "../inspector/Inspector";
import { type LayerPatch, LayersPanel } from "../LayersPanel/LayersPanel";
import { type Tool, Toolbar } from "../Toolbar/Toolbar";
import { type Mode, TopBar } from "../TopBar/TopBar";
import { useDocumentHistory } from "../useDocumentHistory";

const FIT_MARGIN_PX = 32;
const DUPLICATE_OFFSET_MM = 5;
const NUDGE_STEP_MM = 1;
const NUDGE_STEP_LARGE_MM = 10; // Shift

const NUDGE_KEYS: Record<string, { dx: number; dy: number }> = {
	ArrowLeft: { dx: -1, dy: 0 },
	ArrowRight: { dx: 1, dy: 0 },
	ArrowUp: { dx: 0, dy: -1 },
	ArrowDown: { dx: 0, dy: 1 },
};

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
	const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
	const [viewportSize, setViewportSize] = useState<ViewportSize | null>(null);

	const selectedElement =
		history.doc.elements.find((el) => el.id === selectedId) ?? null;
	const selectedGuide =
		history.doc.guides.find((g) => g.id === selectedGuideId) ?? null;

	// Выделение элемента и направляющей взаимоисключающее — выбор одного всегда
	// сбрасывает другое, как и полное снятие выделения (id === null).
	const handleSelectElement = (id: string | null) => {
		setSelectedId(id);
		setSelectedGuideId(null);
	};
	const handleSelectGuide = (id: string | null) => {
		setSelectedGuideId(id);
		setSelectedId(null);
	};

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
		handleSelectElement(null);
	};

	const handlePlace = (at: PointMm) => {
		const factory = {
			rect: createRect,
			ellipse: createEllipse,
			line: createLine,
			text: createText,
			image: createImage,
		}[tool as "rect" | "ellipse" | "line" | "text" | "image"];
		if (!factory) return;
		const element = factory(at);
		// boundary: без него быстрая печать сразу после добавления могла бы смёржиться
		// с созданием элемента в один шаг истории — один Ctrl+Z снёс бы и то, и другое
		history.set((doc) => ({ ...doc, elements: [...doc.elements, element] }), {
			boundary: true,
		});
		handleSelectElement(element.id);
		setTool("select");
	};

	const handleElementChange = (updated: CutlineElement) => {
		history.set((doc) => ({
			...doc,
			elements: doc.elements.map((el) => (el.id === updated.id ? updated : el)),
		}));
	};

	// Создание/перенос(драгом)/удаление направляющей — дискретные структурные правки
	// (Canvas.tsx передаёт boundary:true явно); правка числового поля в инспекторе —
	// как и у элементов, без boundary, коалесцируется тайм-аутным механизмом.
	const handleGuidesChange = (
		guides: Guide[],
		options?: { boundary?: boolean },
	) => {
		history.set((doc) => ({ ...doc, guides }), options);
	};

	const handleGuidePositionChange = (guide: Guide) => {
		handleGuidesChange(
			history.doc.guides.map((g) => (g.id === guide.id ? guide : g)),
		);
	};

	// Лок/видимость/переименование и реордер — дискретные структурные правки,
	// как создание/удаление элемента: не должны схлопываться по коалессингу с соседними.
	const handleLayerChange = (id: string, patch: LayerPatch) => {
		history.set(
			(doc) => ({
				...doc,
				elements: doc.elements.map((el) =>
					el.id === id ? { ...el, ...patch } : el,
				),
			}),
			{ boundary: true },
		);
	};

	const handleReorder = (elements: CutlineElement[]) => {
		history.set((doc) => ({ ...doc, elements }), { boundary: true });
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

			// Ctrl/Cmd+D — дублирование выделенного элемента. Тот же guard на фокус
			// в поле ввода, что и у Delete ниже: иначе перехватили бы у браузера
			// его родное Ctrl+D (добавить в закладки) прямо во время правки текста.
			if (mod && key === "d") {
				if (isTextEntryTarget(document.activeElement)) return;
				if (!selectedId) return;
				e.preventDefault();
				// id генерируем заранее (не зависит от doc), а поиск исходного элемента —
				// внутри апдейтера: doc там всегда актуальный аргумент, а не значение
				// из замыкания на момент последней пересборки эффекта.
				const newId = crypto.randomUUID();
				history.set(
					(doc) => {
						const original = doc.elements.find((el) => el.id === selectedId);
						if (!original) return doc;
						const copy: CutlineElement = {
							...original,
							id: newId,
							x: original.x + DUPLICATE_OFFSET_MM,
							y: original.y + DUPLICATE_OFFSET_MM,
						};
						return { ...doc, elements: [...doc.elements, copy] };
					},
					{ boundary: true },
				);
				setSelectedId(newId);
				setSelectedGuideId(null);
				return;
			}

			// Стрелки — сдвиг выделенного элемента. Без boundary: держать стрелку
			// нажатой должно коалесцироваться в один шаг истории существующим
			// тайм-аутным механизмом (COALESCE_MS в useDocumentHistory), а не плодить
			// шаг на каждое повторение keydown при удержании клавиши.
			const nudge = NUDGE_KEYS[e.key];
			if (nudge) {
				if (isTextEntryTarget(document.activeElement)) return;
				if (!selectedId) return;
				e.preventDefault();
				const step = e.shiftKey ? NUDGE_STEP_LARGE_MM : NUDGE_STEP_MM;
				history.set((doc) => ({
					...doc,
					elements: doc.elements.map((el) =>
						el.id === selectedId
							? { ...el, x: el.x + nudge.dx * step, y: el.y + nudge.dy * step }
							: el,
					),
				}));
				return;
			}

			// Delete/Backspace удаляют выделенный элемент или направляющую — но не когда
			// фокус в поле инспектора, иначе Backspace при правке текста стирал бы их,
			// а не символ в поле.
			if (e.key !== "Delete" && e.key !== "Backspace") return;
			if (isTextEntryTarget(document.activeElement)) return;
			if (selectedGuideId) {
				e.preventDefault();
				history.set(
					(doc) => ({
						...doc,
						guides: doc.guides.filter((g) => g.id !== selectedGuideId),
					}),
					{ boundary: true },
				);
				setSelectedGuideId(null);
				return;
			}
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
	}, [selectedId, selectedGuideId, history.set, history.undo, history.redo]);

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
						onSelect={handleSelectElement}
						onLayerChange={handleLayerChange}
						onReorder={handleReorder}
						guides={history.doc.guides}
						selectedGuideId={selectedGuideId}
						onSelectGuide={handleSelectGuide}
					/>
					<Canvas
						doc={history.doc}
						zoom={zoom}
						tool={tool}
						selectedId={selectedId}
						onSelect={handleSelectElement}
						onPlace={handlePlace}
						onElementChange={handleElementChange}
						onGuidesChange={handleGuidesChange}
						selectedGuideId={selectedGuideId}
						onSelectGuide={handleSelectGuide}
						onViewportResize={setViewportSize}
					/>
					<Inspector
						canvas={history.doc.canvas}
						onCanvasChange={(canvas) =>
							history.set((doc) => ({ ...doc, canvas }))
						}
						selectedElement={selectedElement}
						onElementChange={handleElementChange}
						selectedGuide={selectedGuide}
						onGuideChange={handleGuidePositionChange}
					/>
				</div>
			)}
		</div>
	);
}
