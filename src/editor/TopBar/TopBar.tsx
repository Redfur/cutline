import type { ChangeEvent } from "react";
import { downloadDocument, openDocumentFile } from "../../export/document";
import { downloadPng } from "../../export/png";
import { downloadSvg } from "../../export/svg";
import type { CutlineDocument, DataRecord } from "../../model/document";
import { render, renderedSize } from "../../render/render";
import { SaveIndicator } from "../../ui/feedback/SaveIndicator";
import { Button } from "../../ui/forms/Button";
import { IconButton } from "../../ui/forms/IconButton";
import { SegmentedControl } from "../../ui/forms/SegmentedControl";
import styles from "./TopBar.module.css";

export type Mode = "design" | "data";

export interface TopBarProps {
	doc: CutlineDocument;
	// SVG/PNG экспортируют ту карточку, что сейчас на холсте, — пакетный экспорт
	// всех записей относится к Этапу 4
	record: DataRecord;
	mode: Mode;
	onModeChange: (mode: Mode) => void;
	onOpenDocument: (doc: CutlineDocument) => void;
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
}

export function TopBar({
	doc,
	record,
	mode,
	onModeChange,
	onOpenDocument,
	canUndo,
	canRedo,
	onUndo,
	onRedo,
}: TopBarProps) {
	const handleOpen = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		openDocumentFile(file)
			.then(onOpenDocument)
			.catch((err: unknown) => {
				alert(err instanceof Error ? err.message : String(err));
			});
	};

	return (
		<div className={styles.topBar}>
			<span className={styles.logo}>Cutline</span>
			<SaveIndicator status="saved" />
			<div className={styles.history}>
				<IconButton
					icon="undo-2"
					label="Отменить"
					disabled={!canUndo}
					onClick={onUndo}
				/>
				<IconButton
					icon="redo-2"
					label="Повторить"
					disabled={!canRedo}
					onClick={onRedo}
				/>
			</div>
			<div className={styles.modeSwitch}>
				<SegmentedControl
					size="lg"
					value={mode}
					onChange={(v) => onModeChange(v as Mode)}
					options={[
						{ value: "design", label: "Дизайн" },
						{ value: "data", label: "Данные" },
					]}
				/>
			</div>
			<Button
				variant="ghost"
				onClick={() =>
					downloadSvg(
						render(doc, record, {
							outlines: false,
							bleed: false,
							marks: false,
						}),
						"cutline.svg",
					)
				}
			>
				Экспорт SVG
			</Button>
			<Button
				variant="ghost"
				onClick={() => {
					const opts = { outlines: false, bleed: false, marks: false };
					const svg = render(doc, record, opts);
					const { widthMm, heightMm } = renderedSize(doc.canvas, opts);
					downloadPng(svg, widthMm, heightMm, 300, "cutline@300dpi.png");
				}}
			>
				Экспорт PNG
			</Button>
			<Button
				variant="ghost"
				onClick={() => downloadDocument(doc, "cutline.json")}
			>
				Сохранить
			</Button>
			<label className={styles.openLabel}>
				<span className={styles.openButton}>Открыть…</span>
				<input
					type="file"
					accept="application/json"
					onChange={handleOpen}
					className={styles.fileInput}
				/>
			</label>
		</div>
	);
}
