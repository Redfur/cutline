// Заблокированный элемент (ui-spec, состояние 5): поля инспектора неактивны. Нативный
// disabled у fieldset гасит все input/select/button портов дизайн-системы разом —
// не нужно протаскивать disabled в каждое поле и каждый ColorField.
import type { ReactNode } from "react";
import styles from "./LockedFieldset.module.css";

export interface LockedFieldsetProps {
	locked: boolean;
	children: ReactNode;
}

export function LockedFieldset({ locked, children }: LockedFieldsetProps) {
	return (
		<fieldset
			disabled={locked}
			className={`${styles.fieldset} ${locked ? styles.locked : ""}`}
		>
			{children}
		</fieldset>
	);
}
