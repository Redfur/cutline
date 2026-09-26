// Полоса над секциями: что сейчас в инспекторе. Без неё секции «Положение и размер»
// у текста и у прямоугольника неотличимы — непонятно, чьи это свойства.
import { Icon, type IconProps } from "../../../ui/core/Icon";
import styles from "./InspectorHeader.module.css";

export interface InspectorHeaderProps {
	icon?: IconProps["name"];
	title: string;
	// серая подпись справа: тип элемента или «Ничего не выделено»
	kind: string;
}

export function InspectorHeader({ icon, title, kind }: InspectorHeaderProps) {
	return (
		<div className={styles.header}>
			{icon && (
				<span className={styles.icon}>
					<Icon name={icon} size={14} />
				</span>
			)}
			<span className={styles.title}>{title}</span>
			<span className={styles.kind}>{kind}</span>
		</div>
	);
}
