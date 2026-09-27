// Имя документа в шапке (DocName в макете проекта cutline): клик — список документов,
// двойной клик или F2 — переименование прямо на месте. Enter сохраняет, Esc отменяет,
// уход фокуса — сохраняет (как в макете).
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Icon } from "../../../ui/core/Icon";
import styles from "./DocName.module.css";

export interface DocNameProps {
	name: string;
	open: boolean;
	editing: boolean;
	onToggle: () => void;
	onStartEdit: () => void;
	onCommit: (name: string) => void;
	onCancel: () => void;
}

export function DocName({
	name,
	open,
	editing,
	onToggle,
	onStartEdit,
	onCommit,
	onCancel,
}: DocNameProps) {
	const [value, setValue] = useState(name);
	const input = useRef<HTMLInputElement>(null);
	// Esc отменяет, но blur после него всё равно придёт — без флага он бы сохранил
	const cancelled = useRef(false);

	useEffect(() => {
		if (!editing) return;
		cancelled.current = false;
		setValue(name);
		input.current?.focus();
		input.current?.select();
	}, [editing, name]);

	if (editing) {
		const commit = () => {
			if (!cancelled.current) onCommit(input.current?.value ?? value);
		};
		const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				e.preventDefault();
				input.current?.blur();
			}
			if (e.key === "Escape") {
				e.preventDefault();
				cancelled.current = true;
				onCancel();
			}
		};
		return (
			<input
				ref={input}
				className={styles.input}
				aria-label="Имя документа"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onBlur={commit}
				onKeyDown={onKeyDown}
				// поле растёт с именем, как в макете, но не уже 160 px
				style={{ width: `max(160px, ${value.length + 3}ch)` }}
			/>
		);
	}

	return (
		<button
			type="button"
			className={`${styles.name} ${open ? styles.open : ""}`}
			title="Список документов · двойной щелчок — переименовать"
			aria-haspopup="listbox"
			aria-expanded={open}
			onClick={onToggle}
			onDoubleClick={onStartEdit}
		>
			<span className={styles.text}>{name}</span>
			<span className={styles.chevron}>
				<Icon name="chevron-down" size={14} />
			</span>
		</button>
	);
}
