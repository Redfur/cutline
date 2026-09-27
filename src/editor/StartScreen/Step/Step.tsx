import styles from "./Step.module.css";

export interface StepProps {
	number: number;
	title: string;
	text: string;
}

export function Step({ number, title, text }: StepProps) {
	return (
		<li className={styles.step}>
			<span className={styles.number}>{number}</span>
			<span className={styles.body}>
				<span className={styles.title}>{title}</span>
				<span className={styles.text}>{text}</span>
			</span>
		</li>
	);
}
