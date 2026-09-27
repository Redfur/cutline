// Плитка стартового экрана: превью, название, размер, примечание и поля шаблона.
import type { ReactNode } from "react";
import { FieldToken } from "../../../ui/editor/FieldToken";
import styles from "./TemplateCard.module.css";

export interface TemplateCardProps {
	name: string;
	// «105 × 148 мм»
	size: string;
	note: string;
	fields: string[];
	preview: ReactNode;
	onPick: () => void;
}

export function TemplateCard({
	name,
	size,
	note,
	fields,
	preview,
	onPick,
}: TemplateCardProps) {
	return (
		<button type="button" className={styles.tile} onClick={onPick}>
			<span className={styles.preview}>{preview}</span>
			<span className={styles.info}>
				<span className={styles.head}>
					<span className={styles.name}>{name}</span>
					<span className={styles.size}>{size}</span>
				</span>
				<span className={styles.note}>{note}</span>
				{fields.length > 0 && (
					<span className={styles.fields}>
						{fields.map((f) => (
							<FieldToken key={f} name={f} />
						))}
					</span>
				)}
			</span>
		</button>
	);
}
