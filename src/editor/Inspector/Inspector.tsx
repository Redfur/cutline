// «Ничего не выделено» → свойства холста. Выделен rect/ellipse/line → ShapeInspector,
// text → TextInspector, image → ImageInspector, направляющая → GuideInspector,
// несколько элементов → MultiInspector. Над ними — шапка с тем, чьи это свойства
// (раскладка из ui_kits/editor/Inspector.jsx), у элементов — ещё выравнивание:
// у группы сверху, у одного элемента — под его свойствами.
import type {
	Canvas as CanvasModel,
	CutlineElement,
	DataRecord,
	ElementType,
	FieldDef,
	Guide,
} from "../../model/document";
import type { IconProps } from "../../ui/core/Icon";
import { Button } from "../../ui/forms/Button";
import { plural } from "../lib/plural";
import type { BorderVisibility } from "../lib/snap";
import { AlignSection } from "./AlignSection";
import { CanvasInspector } from "./CanvasInspector";
import type { RecordError } from "./ElementErrors";
import { GuideInspector } from "./GuideInspector";
import { ImageInspector } from "./ImageInspector";
import styles from "./Inspector.module.css";
import { InspectorHeader } from "./InspectorHeader";
import { MultiInspector } from "./MultiInspector";
import { OverflowAlert } from "./OverflowAlert";
import { ShapeInspector } from "./ShapeInspector";
import { TextInspector } from "./TextInspector";

export interface InspectorProps {
	// заголовок, когда ничего не выделено: секция ниже уже называется «Холст»
	docName: string;
	canvas: CanvasModel;
	onCanvasChange: (canvas: CanvasModel) => void;
	selectedElement: CutlineElement | null;
	onElementChange: (element: CutlineElement) => void;
	// все выделенные; больше одного — групповой инспектор
	selectedElements: CutlineElement[];
	// все элементы документа — групповые правки возвращают их целиком
	elements: CutlineElement[];
	onElementsChange: (
		elements: CutlineElement[],
		options?: { boundary?: boolean },
	) => void;
	selectedGuide: Guide | null;
	onGuideChange: (guide: Guide) => void;
	fields: FieldDef[];
	// текущая запись предпросмотра
	record: DataRecord;
	// номера записей (с 1), где выделенный текст не влезает
	overflowRecords: number[];
	// ошибки функций и не загрузившиеся картинки выделенного элемента по записям
	elementErrors: RecordError[];
	// цвета документа — быстрый выбор у каждого поля цвета
	swatches: string[];
	// видимость границ холста — галочки «Направляющие»
	borders: BorderVisibility;
	onBordersChange: (borders: BorderVisibility) => void;
	// элементы, не влезшие на текущей записи, — сводка у холста, когда ничего не выделено
	overflowElements: CutlineElement[];
	onSelectElement: (id: string) => void;
}

const TYPE_LABEL: Record<ElementType, string> = {
	text: "Текст",
	rect: "Прямоугольник",
	ellipse: "Эллипс",
	line: "Линия",
	image: "Изображение",
};

const TYPE_ICON: Record<ElementType, IconProps["name"]> = {
	text: "type",
	rect: "square",
	ellipse: "circle",
	line: "slash",
	image: "image",
};

export function Inspector({
	docName,
	canvas,
	onCanvasChange,
	selectedElement,
	onElementChange,
	selectedElements,
	elements,
	onElementsChange,
	selectedGuide,
	onGuideChange,
	fields,
	record,
	overflowRecords,
	elementErrors,
	swatches,
	borders,
	onBordersChange,
	overflowElements,
	onSelectElement,
}: InspectorProps) {
	const selectedIds = selectedElements.map((el) => el.id);
	const align = (
		<AlignSection
			elements={elements}
			ids={selectedIds}
			card={{ x: 0, y: 0, w: canvas.w, h: canvas.h }}
			// нажатие кнопки — отдельное действие, не склеивается с набором в поле
			onChange={(els) => onElementsChange(els, { boundary: true })}
		/>
	);
	return (
		<aside className={styles.inspector}>
			{selectedGuide ? (
				<>
					<InspectorHeader
						title="Направляющая"
						kind={selectedGuide.axis === "x" ? "по X" : "по Y"}
					/>
					<GuideInspector guide={selectedGuide} onChange={onGuideChange} />
				</>
			) : selectedElements.length > 1 ? (
				<>
					<InspectorHeader
						title={`${selectedElements.length} ${plural(
							selectedElements.length,
							"элемент",
							"элемента",
							"элементов",
						)}`}
						kind="Несколько"
					/>
					{align}
					<MultiInspector
						elements={elements}
						ids={selectedIds}
						onChange={onElementsChange}
					/>
				</>
			) : selectedElement ? (
				<>
					<InspectorHeader
						icon={TYPE_ICON[selectedElement.type]}
						title={selectedElement.name}
						kind={TYPE_LABEL[selectedElement.type]}
					/>
					{(selectedElement.type === "rect" ||
						selectedElement.type === "ellipse" ||
						selectedElement.type === "line") && (
						<ShapeInspector
							element={selectedElement}
							onChange={onElementChange}
							swatches={swatches}
						/>
					)}
					{selectedElement.type === "text" && (
						<TextInspector
							key={selectedElement.id}
							element={selectedElement}
							onChange={onElementChange}
							fields={fields}
							record={record}
							overflowRecords={overflowRecords}
							recordErrors={elementErrors}
							swatches={swatches}
						/>
					)}
					{selectedElement.type === "image" && (
						<ImageInspector
							element={selectedElement}
							onChange={onElementChange}
							fields={fields}
							record={record}
							recordErrors={elementErrors}
							swatches={swatches}
							canvasBackground={canvas.background}
						/>
					)}
					{/* у одного элемента — внизу: плашки переполнения и свойства типа важнее */}
					{align}
				</>
			) : (
				<>
					<InspectorHeader title={docName} kind="Ничего не выделено" />
					{overflowElements[0] && (
						<OverflowAlert
							title={`${overflowElements.length} ${plural(
								overflowElements.length,
								"элемент не влезает",
								"элемента не влезают",
								"элементов не влезают",
							)}`}
							actions={
								// первый — чинить по одному, остальные подсвечены на холсте
								<Button
									size="sm"
									variant="warning"
									onClick={() => onSelectElement(overflowElements[0].id)}
								>
									Выделить «{overflowElements[0].name}»
								</Button>
							}
						/>
					)}
					<CanvasInspector
						canvas={canvas}
						onChange={onCanvasChange}
						swatches={swatches}
						borders={borders}
						onBordersChange={onBordersChange}
					/>
				</>
			)}
		</aside>
	);
}
