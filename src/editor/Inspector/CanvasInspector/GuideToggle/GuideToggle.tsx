// Галочка видимости одной границы холста с образцом её линии: по подписи «Вылет»
// не догадаться, какая из пунктирных рамок на холсте — она, по образцу видно сразу.
import { Checkbox } from "../../../../ui/forms/Checkbox";
import styles from "./GuideToggle.module.css";

export interface GuideToggleProps {
	label: string;
	kind: "trim" | "bleed" | "safe";
	checked: boolean;
	onChange: (checked: boolean) => void;
}

export function GuideToggle({
	label,
	kind,
	checked,
	onChange,
}: GuideToggleProps) {
	return (
		<Checkbox
			checked={checked}
			onChange={onChange}
			label={
				<span className={styles.label}>
					{label}
					<span className={`${styles.sample} ${styles[kind]}`} />
				</span>
			}
		/>
	);
}
