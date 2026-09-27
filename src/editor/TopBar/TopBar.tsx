// Шапка по макету (ui_kits/editor/Chrome.jsx): одна основная кнопка «Экспорт» и меню
// «…» с файловыми действиями. Форматы, раскладка и записи выбираются в диалоге
// экспорта — отдельные кнопки под каждый формат в шапке не держим.
import { type ChangeEvent, useRef } from "react";
import { downloadDocument, openDocumentFile } from "../../export/document";
import { documentFileName } from "../../export/fileName";
import type { CutlineDocument } from "../../model/document";
import { SaveIndicator } from "../../ui/feedback/SaveIndicator";
import { Button } from "../../ui/forms/Button";
import { IconButton } from "../../ui/forms/IconButton";
import { SegmentedControl } from "../../ui/forms/SegmentedControl";
import { Menu } from "../../ui/overlays/Menu";
import type { AutosaveState } from "../lib/useAutosave";
import styles from "./TopBar.module.css";

export type Mode = "design" | "data";

export interface TopBarProps {
	doc: CutlineDocument;
	mode: Mode;
	onModeChange: (mode: Mode) => void;
	onOpenDocument: (doc: CutlineDocument) => void;
	onNewDocument: () => void;
	onExport: () => void;
	save: AutosaveState;
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
	onNewDocument,
	onExport,
	save,
	canUndo,
	canRedo,
	onUndo,
	onRedo,
}: TopBarProps) {
	// пункт меню — кнопка, а файловый диалог открывает только клик по input[type=file]
	const fileInput = useRef<HTMLInputElement>(null);

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
			<span className={styles.divider} />
			<span title={save.message ?? undefined}>
				<SaveIndicator status={save.status} label={save.label ?? undefined} />
			</span>
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
			<Button variant="primary" icon="download" onClick={onExport}>
				Экспорт
			</Button>
			<Menu
				align="right"
				width={220}
				trigger={<IconButton icon="ellipsis" label="Меню" />}
				items={[
					// С автосохранением перезагрузка возвращает прошлый документ — к пустому
					// листу иначе не вернуться. Отменяется Ctrl+Z, поэтому без подтверждения
					{ label: "Новый документ", icon: "plus", onSelect: onNewDocument },
					{
						label: "Открыть файл…",
						icon: "file-text",
						onSelect: () => fileInput.current?.click(),
					},
					{
						label: "Сохранить в файл",
						icon: "download",
						onSelect: () =>
							downloadDocument(doc, documentFileName(doc.name, "json")),
					},
				]}
			/>
			<input
				ref={fileInput}
				type="file"
				accept="application/json"
				onChange={handleOpen}
				className={styles.fileInput}
			/>
		</div>
	);
}
