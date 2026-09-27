import type { HelpItem as HelpItemData } from "../../../help/content";
import { RichText } from "../../RichText";
import styles from "./HelpItem.module.css";

export interface HelpItemProps {
	item: HelpItemData;
	// nonce подсветки: пункт открыли кнопкой «i»; null — не подсвечен
	flash: number | null;
}

export function HelpItem({ item, flash }: HelpItemProps) {
	return (
		<div
			// новый key на каждую подсветку перезапускает CSS-анимацию
			key={flash ?? "idle"}
			data-topic={item.id}
			className={`${styles.item} ${flash !== null ? styles.flash : ""}`}
		>
			<span className={styles.title}>{item.title}</span>
			<span className={styles.text}>
				<RichText text={item.text} />
			</span>
			{item.example && <code className={styles.example}>{item.example}</code>}
		</div>
	);
}
