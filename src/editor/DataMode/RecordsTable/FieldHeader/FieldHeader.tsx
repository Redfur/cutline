// Заголовок колонки: label, ключ плейсхолдера и меню. Правка — инлайн в самом
// заголовке (как в мокапе ui_kits/editor/DataView.jsx), а не диалогом: переименовать колонку — дело
// одной секунды, и видеть соседние колонки при этом полезно.
import { useState } from "react";
import type { FieldDef } from "../../../../model/document";
import { IconButton } from "../../../../ui/forms/IconButton";
import { Menu } from "../../../../ui/overlays/Menu";
import styles from "./FieldHeader.module.css";

type EditTarget = "label" | "key";

export interface FieldHeaderProps {
	field: FieldDef;
	// новое поле открывается сразу в переименовании — «Поле 3» никто не оставляет
	startEditing?: boolean;
	onLabelChange: (label: string) => void;
	// null — ключ принят; строка — почему нет (поле остаётся в режиме правки)
	onKeyChange: (key: string) => string | null;
	onDelete: () => void;
}

export function FieldHeader({
	field,
	startEditing,
	onLabelChange,
	onKeyChange,
	onDelete,
}: FieldHeaderProps) {
	const [edit, setEdit] = useState<EditTarget | null>(
		startEditing ? "label" : null,
	);
	const [draft, setDraft] = useState(field.label);
	const [error, setError] = useState<string | null>(null);

	const begin = (target: EditTarget) => {
		setDraft(target === "key" ? field.key : field.label);
		setError(null);
		setEdit(target);
	};

	const cancel = () => {
		setError(null);
		setEdit(null);
	};

	// blur после ошибки ключа — отмена, а не повторная попытка: иначе поле нельзя
	// покинуть, не придумав ключ
	const commit = (fromBlur: boolean) => {
		const value = draft.trim();
		if (edit === "label") {
			if (value && value !== field.label) onLabelChange(value);
			cancel();
			return;
		}
		const problem = onKeyChange(value);
		if (problem && !fromBlur) {
			setError(problem);
			return;
		}
		cancel();
	};

	if (edit) {
		return (
			<div className={styles.header}>
				<input
					// biome-ignore lint/a11y/noAutofocus: поле появляется по явной команде «Переименовать» — фокус и есть ожидаемое поведение
					autoFocus
					className={`${styles.input} ${edit === "key" ? styles.mono : ""} ${error ? styles.invalid : ""}`}
					value={draft}
					title={error ?? undefined}
					aria-invalid={!!error}
					aria-label={edit === "key" ? "Ключ поля" : "Название поля"}
					onFocus={(e) => e.currentTarget.select()}
					onChange={(e) => {
						setDraft(e.target.value);
						setError(null);
					}}
					onBlur={() => commit(true)}
					onKeyDown={(e) => {
						if (e.key === "Enter") commit(false);
						if (e.key === "Escape") cancel();
					}}
				/>
			</div>
		);
	}

	return (
		<div className={styles.header}>
			<span className={styles.label}>{field.label}</span>
			<span className={styles.key}>{`{{${field.key}}}`}</span>
			<Menu
				align="right"
				width={200}
				trigger={
					<IconButton
						size="sm"
						icon="chevron-down"
						label={`Меню поля ${field.label}`}
					/>
				}
				items={[
					{
						label: "Переименовать",
						icon: "type",
						onSelect: () => begin("label"),
					},
					{
						label: "Изменить ключ",
						icon: "braces",
						onSelect: () => begin("key"),
					},
					{ separator: true },
					{
						label: "Удалить поле",
						icon: "trash-2",
						danger: true,
						onSelect: onDelete,
					},
				]}
			/>
		</div>
	);
}
