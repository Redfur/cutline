// «Ничего не выделено» → свойства холста. Выделен rect/ellipse/line → ShapeInspector,
// text → TextInspector. Выделен image — этот тип ещё не добавляется через тулбар, но
// уже может прийти из открытого файла — честная заглушка вместо неверных полей.
import type {
	Canvas as CanvasModel,
	CutlineElement,
	Guide,
} from "../../model/document";
import { CanvasInspector } from "./CanvasInspector";
import { GuideInspector } from "./GuideInspector";
import { ImageInspector } from "./ImageInspector";
import styles from "./Inspector.module.css";
import { ShapeInspector } from "./ShapeInspector";
import { TextInspector } from "./TextInspector";

export interface InspectorProps {
	canvas: CanvasModel;
	onCanvasChange: (canvas: CanvasModel) => void;
	selectedElement: CutlineElement | null;
	onElementChange: (element: CutlineElement) => void;
	selectedGuide: Guide | null;
	onGuideChange: (guide: Guide) => void;
}

export function Inspector({
	canvas,
	onCanvasChange,
	selectedElement,
	onElementChange,
	selectedGuide,
	onGuideChange,
}: InspectorProps) {
	return (
		<div className={styles.inspector}>
			{selectedGuide && (
				<GuideInspector guide={selectedGuide} onChange={onGuideChange} />
			)}
			{!selectedGuide && !selectedElement && (
				<CanvasInspector canvas={canvas} onChange={onCanvasChange} />
			)}
			{!selectedGuide &&
				selectedElement &&
				(selectedElement.type === "rect" ||
					selectedElement.type === "ellipse" ||
					selectedElement.type === "line") && (
					<ShapeInspector
						element={selectedElement}
						onChange={onElementChange}
					/>
				)}
			{selectedElement && selectedElement.type === "text" && (
				<TextInspector
					key={selectedElement.id}
					element={selectedElement}
					onChange={onElementChange}
				/>
			)}
			{selectedElement && selectedElement.type === "image" && (
				<ImageInspector element={selectedElement} onChange={onElementChange} />
			)}
		</div>
	);
}
