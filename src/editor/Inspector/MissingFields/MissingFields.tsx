// Плейсхолдеры без колонки в данных: опечатка или удалённое поле. Рендер подставит
// пустую строку (document-model.md), и на всех карточках будет молча пусто — без
// этой строки в инспекторе причину не найти.
import { placeholderKeys } from "../../../data/placeholders";
import type { FieldDef } from "../../../model/document";
import { FieldToken } from "../../../ui/editor/FieldToken";
import { PropertyRow } from "../../../ui/editor/PropertyRow";
import styles from "./MissingFields.module.css";

export interface MissingFieldsProps {
	template: string;
	fields: FieldDef[];
}

export function MissingFields({ template, fields }: MissingFieldsProps) {
	const missing = [
		...new Set(
			placeholderKeys(template).filter(
				(key) => !fields.some((f) => f.key === key),
			),
		),
	];
	if (!missing.length) return null;
	return (
		<PropertyRow label="Нет поля">
			<span className={styles.tokens}>
				{missing.map((key) => (
					<FieldToken key={key} name={key} missing />
				))}
			</span>
		</PropertyRow>
	);
}
