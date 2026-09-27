import styles from "./RichText.module.css";

export interface RichTextProps {
	// `обратные кавычки` — моноширинный фрагмент: плейсхолдеры и вызовы функций
	text: string;
}

export function RichText({ text }: RichTextProps) {
	// split с группой кладёт найденное на нечётные места
	return text.split(/`([^`]+)`/).map((part, i) =>
		i % 2 ? (
			<code key={part + String(i)} className={styles.code}>
				{part}
			</code>
		) : (
			part
		),
	);
}
