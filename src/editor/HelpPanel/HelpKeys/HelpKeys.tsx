import styles from "./HelpKeys.module.css";

export interface HelpKeysProps {
	// клавиши через пробел; «Mod» — ⌘ на Mac, Ctrl на остальных, как в EditorShell
	keys: string;
}

const MAC = /Mac|iPhone|iPad/.test(navigator.platform);

export function HelpKeys({ keys }: HelpKeysProps) {
	return (
		<span className={styles.keys}>
			{keys.split(" ").map((key, i) => (
				<kbd key={key + String(i)} className={styles.key}>
					{key === "Mod" ? (MAC ? "⌘" : "Ctrl") : key}
				</kbd>
			))}
		</span>
	);
}
