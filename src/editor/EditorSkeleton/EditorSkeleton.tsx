// Заглушка редактора, пока сессия читается из IndexedDB. Повторяет раскладку оболочки
// (те же токены ширины панелей, та же карточка A6 на 100% зума), чтобы при появлении
// настоящего редактора ничего не прыгало — меняется только содержимое.
import { BASE_PX_PER_MM } from "../Canvas";
import styles from "./EditorSkeleton.module.css";

export interface EditorSkeletonProps {
	// размер карточки до загрузки неизвестен — берём A6, как у пустого документа
	cardWidthMm?: number;
	cardHeightMm?: number;
}

const LAYER_ROWS = [72, 56, 84, 64, 48, 76];
const INSPECTOR_ROWS = [100, 100, 60, 100, 80];

export function EditorSkeleton({
	cardWidthMm = 105,
	cardHeightMm = 148,
}: EditorSkeletonProps) {
	return (
		<div
			className={styles.shell}
			role="status"
			aria-busy="true"
			aria-label="Загрузка документа"
		>
			<div className={styles.topBar}>
				<span className={styles.logo}>Cutline</span>
				<span className={`${styles.bar} ${styles.status}`} />
				<span className={`${styles.bar} ${styles.modeSwitch}`} />
			</div>
			<div className={styles.workspace}>
				<div className={styles.toolbar}>
					{[0, 1, 2, 3, 4, 5].map((i) => (
						<span key={i} className={`${styles.bar} ${styles.tool}`} />
					))}
				</div>
				<div className={styles.layers}>
					{LAYER_ROWS.map((w, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: статичный список заглушек
						<div key={i} className={styles.row}>
							<span className={`${styles.bar} ${styles.icon}`} />
							<span className={styles.bar} style={{ width: `${w}%` }} />
						</div>
					))}
				</div>
				<div className={styles.canvas}>
					<div
						className={styles.card}
						style={{
							width: cardWidthMm * BASE_PX_PER_MM,
							height: cardHeightMm * BASE_PX_PER_MM,
						}}
					/>
				</div>
				<div className={styles.inspector}>
					<span className={`${styles.bar} ${styles.heading}`} />
					{INSPECTOR_ROWS.map((w, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: статичный список заглушек
						<div key={i} className={styles.row}>
							<span className={`${styles.bar} ${styles.label}`} />
							<span
								className={`${styles.bar} ${styles.field}`}
								style={{ width: `${w}%` }}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
