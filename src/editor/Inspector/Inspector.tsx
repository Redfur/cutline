// «Ничего не выделено» → свойства холста. Выделен rect/ellipse/line → ShapeInspector,
// text → TextInspector, image → ImageInspector, направляющая → GuideInspector. Над
// ними — шапка с тем, чьи это свойства (раскладка из ui_kits/editor/Inspector.jsx).
import type {
	Canvas as CanvasModel,
	CutlineElement,
	DataRecord,
	ElementType,
	FieldDef,
	Guide,
} from "../../model/document";
import type { IconProps } from "../../ui/core/Icon";
import type { BorderVisibility } from "../lib/snap";
import { CanvasInspector } from "./CanvasInspector";
import { GuideInspector } from "./GuideInspector";
import { ImageInspector } from "./ImageInspector";
import styles from "./Inspector.module.css";
import { InspectorHeader } from "./InspectorHeader";
import { ShapeInspector } from "./ShapeInspector";
import { TextInspector } from "./TextInspector";

export interface InspectorProps {
	canvas: CanvasModel;
	onCanvasChange: (canvas: CanvasModel) => void;
	selectedElement: CutlineElement | null;
	onElementChange: (element: CutlineElement) => void;
	selectedGuide: Guide | null;
	onGuideChange: (guide: Guide) => void;
	fields: FieldDef[];
	// текущая запись предпросмотра
	record: DataRecord;
	// номера записей (с 1), где выделенный текст не влезает
	overflowRecords: number[];
	// цвета документа — быстрый выбор у каждого поля цвета
	swatches: string[];
	// видимость границ холста — галочки «Направляющие»
	borders: BorderVisibility;
	onBordersChange: (borders: BorderVisibility) => void;
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
	canvas,
	onCanvasChange,
	selectedElement,
	onElementChange,
	selectedGuide,
	onGuideChange,
	fields,
	record,
	overflowRecords,
	swatches,
	borders,
	onBordersChange,
}: InspectorProps) {
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
							swatches={swatches}
						/>
					)}
					{selectedElement.type === "image" && (
						<ImageInspector
							element={selectedElement}
							onChange={onElementChange}
							fields={fields}
							record={record}
						/>
					)}
				</>
			) : (
				<>
					<InspectorHeader title="Холст" kind="Ничего не выделено" />
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
