import type { ChangeEvent } from "react";
import { downloadDocument, openDocumentFile } from "../export/document";
import { downloadPng } from "../export/png";
import { downloadSvg } from "../export/svg";
import type { CutlineDocument } from "../model/document";
import { render, renderedSize } from "../render/render";
import { SaveIndicator } from "../ui/feedback/SaveIndicator";
import { Button } from "../ui/forms/Button";
import { IconButton } from "../ui/forms/IconButton";
import { SegmentedControl } from "../ui/forms/SegmentedControl";

export type Mode = "design" | "data";

export interface TopBarProps {
	doc: CutlineDocument;
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
		<div
			style={{
				height: "var(--topbar-h)",
				flex: "none",
				display: "flex",
				alignItems: "center",
				gap: 16,
				padding: "0 12px",
				background: "var(--bg-panel)",
				borderBottom: "1px solid var(--border-1)",
			}}
		>
			<span
				style={{
					font: "700 var(--text-md)/1 var(--font-ui)",
					color: "var(--fg-1)",
				}}
			>
				Cutline
			</span>
			<SaveIndicator status="saved" />
			<div style={{ display: "flex", gap: 2 }}>
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
			<div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
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
						render(doc, {}, { outlines: false, bleed: false, marks: false }),
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
					const svg = render(doc, {}, opts);
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
			<label style={{ display: "inline-flex" }}>
				<span
					style={{
						display: "inline-flex",
						alignItems: "center",
						height: "var(--control-md)",
						padding: "0 10px",
						border: "1px solid var(--border-2)",
						borderRadius: "var(--radius-control)",
						font: "500 var(--text-sm)/1 var(--font-ui)",
						cursor: "pointer",
					}}
				>
					Открыть…
				</span>
				<input
					type="file"
					accept="application/json"
					onChange={handleOpen}
					style={{ display: "none" }}
				/>
			</label>
		</div>
	);
}
