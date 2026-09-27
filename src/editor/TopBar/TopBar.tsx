// Шапка по макету проекта cutline (TopBar в editor/CutlineEditor.jsx): имя документа
// со списком документов, индикатор сохранения, режимы по центру, одна основная кнопка
// «Экспорт» и меню «…». Форматы и раскладка — в панели экспорта, отдельных кнопок
// под каждый формат в шапке не держим.
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { downloadDocument, openDocumentFile } from "../../export/document";
import { documentFileName } from "../../export/fileName";
import type { CutlineDocument } from "../../model/document";
import { SaveIndicator } from "../../ui/feedback/SaveIndicator";
import { Button } from "../../ui/forms/Button";
import { IconButton } from "../../ui/forms/IconButton";
import { SegmentedControl } from "../../ui/forms/SegmentedControl";
import { Menu } from "../../ui/overlays/Menu";
import { openHelp } from "../lib/help";
import type { AutosaveState } from "../lib/useAutosave";
import { DeleteDocDialog } from "./DeleteDocDialog";
import { DocName } from "./DocName";
import { DocSwitcher } from "./DocSwitcher";
import styles from "./TopBar.module.css";

export type Mode = "design" | "data";

export interface TopBarProps {
	docId: string;
	doc: CutlineDocument;
	mode: Mode;
	onModeChange: (mode: Mode) => void;
	onRename: (name: string) => void;
	onSwitchDocument: (id: string) => void;
	// файл открывается новым документом списка, текущий не трогается
	onOpenDocument: (doc: CutlineDocument) => void;
	onNewDocument: () => void;
	onDuplicate: () => void;
	onDelete: () => void;
	onExport: () => void;
	save: AutosaveState;
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
}

export function TopBar({
	docId,
	doc,
	mode,
	onModeChange,
	onRename,
	onSwitchDocument,
	onOpenDocument,
	onNewDocument,
	onDuplicate,
	onDelete,
	onExport,
	save,
	canUndo,
	canRedo,
	onUndo,
	onRedo,
}: TopBarProps) {
	// пункт меню — кнопка, а файловый диалог открывает только клик по input[type=file]
	const fileInput = useRef<HTMLInputElement>(null);
	const nameBox = useRef<HTMLDivElement>(null);
	const [switcherOpen, setSwitcherOpen] = useState(false);
	const [editing, setEditing] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	// список закрывается кликом мимо и Esc, как меню
	useEffect(() => {
		if (!switcherOpen) return;
		const onDown = (e: MouseEvent) => {
			if (e.target instanceof Node && !nameBox.current?.contains(e.target)) {
				setSwitcherOpen(false);
			}
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setSwitcherOpen(false);
		};
		document.addEventListener("mousedown", onDown);
		window.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			window.removeEventListener("keydown", onKey);
		};
	}, [switcherOpen]);

	// F2 — переименовать, как в файловых менеджерах; не из поля ввода
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const target = e.target;
			const typing =
				target instanceof HTMLElement &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable);
			if (e.key === "F2" && !typing) {
				e.preventDefault();
				setSwitcherOpen(false);
				setEditing(true);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

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

	const commitName = (value: string) => {
		setEditing(false);
		const name = value.trim();
		if (name && name !== doc.name) onRename(name);
	};

	return (
		<div className={styles.topBar}>
			<span className={styles.logo}>Cutline</span>
			<span className={styles.divider} />
			<div ref={nameBox} className={styles.docName}>
				<DocName
					name={doc.name}
					open={switcherOpen}
					editing={editing}
					onToggle={() => setSwitcherOpen((o) => !o)}
					onStartEdit={() => {
						setSwitcherOpen(false);
						setEditing(true);
					}}
					onCommit={commitName}
					onCancel={() => setEditing(false)}
				/>
				{switcherOpen && !editing && (
					<DocSwitcher
						currentId={docId}
						currentDoc={doc}
						onPick={(id) => {
							setSwitcherOpen(false);
							if (id !== docId) onSwitchDocument(id);
						}}
						onNew={() => {
							setSwitcherOpen(false);
							onNewDocument();
						}}
						onOpenFile={() => {
							setSwitcherOpen(false);
							fileInput.current?.click();
						}}
					/>
				)}
			</div>
			<span className={styles.save} title={save.message ?? undefined}>
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
			<span className={styles.spacer} />
			{/* в макете шапки справки нет — вход в неё нужен на виду, а не только в «…» */}
			<IconButton
				icon="circle-help"
				label="Справка"
				onClick={() => openHelp()}
			/>
			<Button variant="primary" icon="download" onClick={onExport}>
				Экспорт
			</Button>
			<Menu
				align="right"
				width={220}
				trigger={<IconButton icon="ellipsis" label="Меню" />}
				items={[
					// те же пункты, что внизу списка документов: в «…» их ищут первым делом
					{ label: "Новый документ", icon: "plus", onSelect: onNewDocument },
					{
						label: "Открыть файл…",
						icon: "file-text",
						onSelect: () => fileInput.current?.click(),
					},
					{ separator: true },
					{
						label: "Переименовать",
						icon: "type",
						shortcut: "F2",
						onSelect: () => setEditing(true),
					},
					{
						label: "Дублировать документ",
						icon: "copy",
						onSelect: onDuplicate,
					},
					// в макете нет, но без него документ не унести на другую машину
					{
						label: "Сохранить в файл",
						icon: "download",
						onSelect: () =>
							downloadDocument(doc, documentFileName(doc.name, "json")),
					},
					{ separator: true },
					{ label: "Справка", icon: "circle-help", onSelect: () => openHelp() },
					{ separator: true },
					{
						label: "Удалить документ",
						icon: "trash-2",
						danger: true,
						onSelect: () => setConfirmDelete(true),
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
			{confirmDelete && (
				<DeleteDocDialog
					name={doc.name}
					onCancel={() => setConfirmDelete(false)}
					onConfirm={() => {
						setConfirmDelete(false);
						onDelete();
					}}
				/>
			)}
		</div>
	);
}
