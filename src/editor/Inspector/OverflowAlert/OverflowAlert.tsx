// Плашка «не влезает» над секциями инспектора — у текста и у холста. Стоит первой,
// над содержимым: это то, что надо чинить, а кнопки рядом — самые частые способы.
import type { ReactNode } from "react";
import { InlineAlert } from "../../../ui/feedback/InlineAlert";
import styles from "./OverflowAlert.module.css";

export interface OverflowAlertProps {
	title: string;
	children?: ReactNode;
	actions?: ReactNode;
}

export function OverflowAlert({
	title,
	children,
	actions,
}: OverflowAlertProps) {
	return (
		<div className={styles.wrap}>
			<InlineAlert tone="warning" title={title} actions={actions}>
				{children}
			</InlineAlert>
		</div>
	);
}
