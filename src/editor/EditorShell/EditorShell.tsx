// Раскладка «Общей оболочки» и обоих режимов из docs/ui-spec.md. Здесь живёт
// состояние редактора, которое не принадлежит документу: режим, инструмент, зум,
// выделение и текущая запись предпросмотра.
import { useCallback, useEffect, useMemo, useState } from "react";
import { sampleRecord } from "../../data/placeholders";
import {
	documentProblems,
	hasProblems,
	imageHrefs,
	recordProblems,
} from "../../data/problems";
import { ensureFontFaces } from "../../fonts/load";
import type {
	CutlineDocument,
	CutlineElement,
	Guide,
} from "../../model/document";
import type { ViewState } from "../../storage/documents";
import { RecordNavigator } from "../../ui/editor/RecordNavigator";
import { BASE_PX_PER_MM, Canvas, type ViewportSize } from "../Canvas";
import { DataMode } from "../DataMode";
import { ExportPanel } from "../ExportPanel";
import { Inspector } from "../Inspector";
import { type LayerPatch, LayersPanel } from "../LayersPanel";
import { offsetElements } from "../lib/align";
import { documentColors } from "../lib/documentColors";
import { useHelp } from "../lib/help";
import { useAutosave } from "../lib/useAutosave";
import { useBrokenImages } from "../lib/useBrokenImages";
import { useDocumentHistory } from "../lib/useDocumentHistory";
import { useFontsVersion } from "../lib/useFontsVersion";
import { type Tool, Toolbar } from "../Toolbar";
import { type Mode, TopBar } from "../TopBar";
import styles from "./EditorShell.module.css";

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

export interface EditorShellProps {
	// ключ документа в хранилище — туда пишет автосохранение
	docId: string;
	// документ и вид, с которых начинается сессия: сохранённые в IndexedDB или новые
	// (Workspace); дальше редактор ими не управляется — это стартовые значения
	initialDoc: CutlineDocument;
	initialView: ViewState;
	// режим — из адреса (#/doc/<id>/data), чтобы «Назад» в браузере возвращал и его
	mode: Mode;
	onModeChange: (mode: Mode) => void;
	// IndexedDB открылся при загрузке — есть куда сохранять
	storageAvailable: boolean;
	// почему вместо сохранённого документа открылся пустой лист
	notice: string | null;
	// документы — дело Workspace: у каждого свой редактор (key={id}) и своя история
	onSwitchDocument: (id: string) => void;
	// текущий документ и вид — чтобы со стартового экрана вернуться к нему таким, как есть
	onNewDocument: (current: { doc: CutlineDocument; view: ViewState }) => void;
	onOpenDocument: (doc: CutlineDocument) => void;
	onDuplicateDocument: (doc: CutlineDocument) => void;
	onDeleteDocument: () => void;
}

export function EditorShell({
	docId,
	initialDoc,
	initialView,
	mode,
	onModeChange,
	storageAvailable,
	notice,
	onSwitchDocument,
	onNewDocument,
	onOpenDocument,
	onDuplicateDocument,
	onDeleteDocument,
}: EditorShellProps) {
	const history = useDocumentHistory(initialDoc);
	const [tool, setTool] = useState<Tool>("select");
	const [zoom, setZoom] = useState(1);
	// выделенные элементы в порядке выделения; один — обычный инспектор типа,
	// несколько — групповой (выравнивание)
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
	const [viewportSize, setViewportSize] = useState<ViewportSize | null>(null);
	// 0-based; общий для обоих режимов — двойной клик по миниатюре в «Данных» открывает
	// «Дизайн» именно на этой записи
	const [recordIndex, setRecordIndex] = useState(initialView.recordIndex);
	const [borders, setBorders] = useState(initialView.borders);
	const [exporting, setExporting] = useState(false);
	const help = useHelp();

	// панель экспорта с затемнением — справка ушла бы под него; после экспорта
	// возвращается, если была открыта
	useEffect(() => {
		help.setHidden(exporting);
		return () => help.setHidden(false);
	}, [exporting, help]);

	const { records, fields } = history.doc;
	// после удаления записей или undo индекс мог уйти за конец — не храним исправленное
	// значение отдельно, а зажимаем при чтении
	const currentRecord = Math.max(0, Math.min(recordIndex, records.length - 1));
	// без записей карточка показывается на примерах из полей, а не пустой
	const previewRecord =
		records[currentRecord] ?? (records.length ? {} : sampleRecord(fields));
	// один проход раскладки по всем записям на изменение документа — им пользуются
	// таблица, сетка, холст и навигатор
	const fontsVersion = useFontsVersion();
	// шрифт выбрали в инспекторе или открыли файл — догружаем; повторы отсекает сам загрузчик
	useEffect(() => ensureFontFaces(history.doc), [history.doc]);
	// Ссылки картинок по всем записям — браузер проверяет, какие не грузятся: заглушки
	// на холсте и в сетке, проблемы записей. Без записей — по примеру полей, как на холсте
	const hrefs = useMemo(
		() => imageHrefs(history.doc, sampleRecord(history.doc.fields)),
		[history.doc],
	);
	const brokenImages = useBrokenImages(hrefs);
	const preview = useMemo(() => ({ brokenImages }), [brokenImages]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: fontsVersion — см. комментарий у зависимостей
	const problems = useMemo(
		() => documentProblems(history.doc, brokenImages),
		// fontsVersion не читается внутри, но меняет результат measureText — см. хук
		[history.doc, fontsVersion, brokenImages],
	);
	// без записей холст показывает примеры полей — проверяем и их, иначе макет,
	// в который не влезает даже пример, выглядел бы исправным
	const currentProblems = useMemo(
		() =>
			records.length
				? problems[currentRecord]
				: recordProblems(
						history.doc,
						{ record: previewRecord, n: 1 },
						undefined,
						brokenImages,
					),
		[
			records.length,
			problems,
			currentRecord,
			history.doc,
			previewRecord,
			brokenImages,
		],
	);
	const overflowIds = currentProblems?.overflowIds ?? [];
	// ошибки, переполнение и инспектор типа — только у одиночного выделения
	const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
	// ошибки функций и сломанные картинки выделенного элемента — по записям, для инспектора
	const selectedErrors = selectedId
		? problems.flatMap((p, i) =>
				p.errors
					.filter((e) => e.elementId === selectedId)
					.map((e) => ({ n: i + 1, message: e.message })),
			)
		: [];
	const selectedOverflowRecords = selectedId
		? problems.flatMap((p, i) =>
				p.overflowIds.includes(selectedId) ? [i + 1] : [],
			)
		: [];

	const swatches = useMemo(() => documentColors(history.doc), [history.doc]);

	const selectedElement =
		history.doc.elements.find((el) => el.id === selectedId) ?? null;
	const selectedGuide =
		history.doc.guides.find((g) => g.id === selectedGuideId) ?? null;

	const selectedElements = history.doc.elements.filter((el) =>
		selectedIds.includes(el.id),
	);

	// Выделение элементов и направляющей взаимоисключающее — выбор одного всегда
	// сбрасывает другое, как и полное снятие выделения (пустой список / null).
	const handleSelectElements = (ids: string[]) => {
		setSelectedIds(ids);
		setSelectedGuideId(null);
	};
	const handleSelectElement = (id: string) => handleSelectElements([id]);
	const handleSelectGuide = (id: string | null) => {
		setSelectedGuideId(id);
		setSelectedIds([]);
	};

	// стабильная ссылка: сетка миниатюр мемоизирована и не должна перерисовываться
	// из-за новой функции на каждый рендер оболочки
	const handleOpenRecord = useCallback(
		(index: number) => {
			setRecordIndex(index);
			onModeChange("design");
		},
		[onModeChange],
	);

	const handleFitToWindow = () => {
		if (!viewportSize) return;
		const { canvas } = history.doc;
		const fitZoom = Math.min(
			(viewportSize.width - FIT_MARGIN_PX * 2) / (canvas.w * BASE_PX_PER_MM),
			(viewportSize.height - FIT_MARGIN_PX * 2) / (canvas.h * BASE_PX_PER_MM),
		);
		setZoom(Math.max(0.1, fitZoom));
	};

	// сохраняем зажатый индекс, а не сырой: после удаления записей сырой мог уйти
	// за конец, и после перезагрузки навигатор показал бы несуществующую запись
	const view: ViewState = { mode, recordIndex: currentRecord, borders };
	const save = useAutosave(docId, history.doc, view, {
		enabled: storageAvailable,
		notice,
	});

	// Имя — часть документа: переименование отменяется Ctrl+Z, как любая правка
	const handleRename = (name: string) => {
		history.set((doc) => ({ ...doc, name }), { boundary: true });
	};

	// Элемент от инструмента — кликом или протягиванием (Canvas/useDrawElement)
	const handleCreate = (element: CutlineElement) => {
		// boundary: без него быстрая печать сразу после добавления могла бы смёржиться
		// с созданием элемента в один шаг истории — один Ctrl+Z снёс бы и то, и другое
		history.set((doc) => ({ ...doc, elements: [...doc.elements, element] }), {
			boundary: true,
		});
		handleSelectElements([element.id]);
		setTool("select");
	};

	// Инспектор зовёт без boundary — набор в поле склеивается по времени; холст после
	// драга передаёт boundary: драг — отдельное действие, и два быстрых драга подряд
	// (или драг сразу после правки поля) иначе откатывались одним Ctrl+Z
	const handleElementChange = (
		updated: CutlineElement,
		options?: { boundary?: boolean },
	) => {
		history.set(
			(doc) => ({
				...doc,
				elements: doc.elements.map((el) =>
					el.id === updated.id ? updated : el,
				),
			}),
			options,
		);
	};

	// Групповые правки (драг нескольких, выравнивание) — одним шагом истории
	const handleElementsChange = (
		elements: CutlineElement[],
		options?: { boundary?: boolean },
	) => {
		history.set((doc) => ({ ...doc, elements }), options);
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
			// под модальным диалогом холст недоступен: Backspace вне поля удалил бы
			// выделенный элемент, а Ctrl+Z откатил бы документ за спиной у диалога
			if (exporting) return;
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

			// Остальные клавиши — про элементы макета; в «Данных» макета на экране нет,
			// и Backspace мимо ячейки удалял бы невидимый выделенный элемент
			if (mode !== "design") return;

			// ⌘A — выделить всё, что можно тронуть мышью: видимое и незаблокированное
			// (как и рамка). В поле ввода — родное «выделить текст»
			if (mod && key === "a") {
				if (isTextEntryTarget(document.activeElement)) return;
				e.preventDefault();
				setSelectedIds(
					history.doc.elements
						.filter((el) => el.visible && !el.locked)
						.map((el) => el.id),
				);
				setSelectedGuideId(null);
				return;
			}

			// Esc снимает выделение. Справка и диалоги гасят свой Esc раньше (capture)
			if (e.key === "Escape") {
				if (e.defaultPrevented || isTextEntryTarget(document.activeElement))
					return;
				setSelectedIds([]);
				setSelectedGuideId(null);
				return;
			}

			// Ctrl/Cmd+D — дублирование выделенных элементов. Тот же guard на фокус
			// в поле ввода, что и у Delete ниже: иначе перехватили бы у браузера
			// его родное Ctrl+D (добавить в закладки) прямо во время правки текста.
			if (mod && key === "d") {
				if (isTextEntryTarget(document.activeElement)) return;
				if (selectedIds.length === 0) return;
				e.preventDefault();
				// id генерируем заранее (не зависит от doc), а поиск исходных элементов —
				// внутри апдейтера: doc там всегда актуальный аргумент, а не значение
				// из замыкания на момент последней пересборки эффекта. Копии ложатся
				// поверх всех в том же порядке слоёв, что и оригиналы
				const newIds = new Map(
					selectedIds.map((id) => [id, crypto.randomUUID()]),
				);
				history.set(
					(doc) => {
						const copies = doc.elements.flatMap((original) => {
							const id = newIds.get(original.id);
							if (!id) return [];
							return [
								{
									...original,
									id,
									x: original.x + DUPLICATE_OFFSET_MM,
									y: original.y + DUPLICATE_OFFSET_MM,
								},
							];
						});
						return { ...doc, elements: [...doc.elements, ...copies] };
					},
					{ boundary: true },
				);
				setSelectedIds([...newIds.values()]);
				setSelectedGuideId(null);
				return;
			}

			// Стрелки — сдвиг выделенных элементов. Без boundary: держать стрелку
			// нажатой должно коалесцироваться в один шаг истории существующим
			// тайм-аутным механизмом (COALESCE_MS в useDocumentHistory), а не плодить
			// шаг на каждое повторение keydown при удержании клавиши.
			const nudge = NUDGE_KEYS[e.key];
			if (nudge) {
				if (isTextEntryTarget(document.activeElement)) return;
				if (selectedIds.length === 0) return;
				e.preventDefault();
				const step = e.shiftKey ? NUDGE_STEP_LARGE_MM : NUDGE_STEP_MM;
				history.set((doc) => ({
					...doc,
					elements: offsetElements(
						doc.elements,
						selectedIds,
						nudge.dx * step,
						nudge.dy * step,
					),
				}));
				return;
			}

			// Delete/Backspace удаляют выделенные элементы или направляющую — но не когда
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
			if (selectedIds.length === 0) return;
			e.preventDefault();
			history.set(
				(doc) => ({
					...doc,
					elements: doc.elements.filter((el) => !selectedIds.includes(el.id)),
				}),
				{ boundary: true },
			);
			setSelectedIds([]);
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		exporting,
		mode,
		selectedIds,
		selectedGuideId,
		history.doc.elements,
		history.set,
		history.undo,
		history.redo,
	]);

	return (
		<div className={styles.shell}>
			<TopBar
				docId={docId}
				doc={history.doc}
				mode={mode}
				onModeChange={onModeChange}
				onRename={handleRename}
				onSwitchDocument={onSwitchDocument}
				onOpenDocument={onOpenDocument}
				onNewDocument={() => onNewDocument({ doc: history.doc, view })}
				onDuplicate={() => onDuplicateDocument(history.doc)}
				onDelete={onDeleteDocument}
				onExport={() => setExporting(true)}
				save={save}
				canUndo={history.canUndo}
				canRedo={history.canRedo}
				onUndo={history.undo}
				onRedo={history.redo}
			/>
			{mode === "data" ? (
				<DataMode
					doc={history.doc}
					onChange={history.set}
					problems={problems}
					fontsVersion={fontsVersion}
					preview={preview}
					selectedIndex={records.length ? currentRecord : null}
					onSelect={setRecordIndex}
					onOpen={handleOpenRecord}
				/>
			) : (
				<div className={styles.workspace}>
					<Toolbar
						tool={tool}
						onToolChange={setTool}
						zoom={zoom}
						onZoomChange={setZoom}
						onFitToWindow={handleFitToWindow}
					/>
					<LayersPanel
						elements={history.doc.elements}
						selectedIds={selectedIds}
						onSelect={handleSelectElements}
						onLayerChange={handleLayerChange}
						onReorder={handleReorder}
						guides={history.doc.guides}
						warningIds={overflowIds}
						selectedGuideId={selectedGuideId}
						onSelectGuide={handleSelectGuide}
					/>
					<Canvas
						doc={history.doc}
						record={previewRecord}
						recordNumber={currentRecord + 1}
						preview={preview}
						overflowIds={overflowIds}
						bottomBar={
							records.length > 0 && (
								<RecordNavigator
									index={currentRecord + 1}
									total={records.length}
									warning={hasProblems(problems[currentRecord])}
									onPrev={() => setRecordIndex(currentRecord - 1)}
									onNext={() => setRecordIndex(currentRecord + 1)}
								/>
							)
						}
						zoom={zoom}
						tool={tool}
						selectedIds={selectedIds}
						onSelect={handleSelectElements}
						onCreate={handleCreate}
						onElementChange={handleElementChange}
						onElementsChange={handleElementsChange}
						onGuidesChange={handleGuidesChange}
						selectedGuideId={selectedGuideId}
						onSelectGuide={handleSelectGuide}
						onViewportResize={setViewportSize}
						borders={borders}
					/>
					<Inspector
						docName={history.doc.name}
						canvas={history.doc.canvas}
						onCanvasChange={(canvas) =>
							history.set((doc) => ({ ...doc, canvas }))
						}
						selectedElement={selectedElement}
						onElementChange={handleElementChange}
						selectedElements={selectedElements}
						onElementsChange={handleElementsChange}
						elements={history.doc.elements}
						selectedGuide={selectedGuide}
						onGuideChange={handleGuidePositionChange}
						fields={fields}
						record={previewRecord}
						overflowRecords={selectedOverflowRecords}
						elementErrors={selectedErrors}
						swatches={swatches}
						borders={borders}
						onBordersChange={setBorders}
						overflowElements={history.doc.elements.filter((el) =>
							overflowIds.includes(el.id),
						)}
						onSelectElement={handleSelectElement}
					/>
				</div>
			)}
			{exporting && (
				<ExportPanel
					doc={history.doc}
					problems={problems}
					onClose={() => setExporting(false)}
					onShowProblems={() => {
						setExporting(false);
						onModeChange("data");
					}}
				/>
			)}
		</div>
	);
}
