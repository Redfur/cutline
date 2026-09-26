import { MAJOR_TICK_MM, MINOR_TICK_MM, PAD_MM } from "./constants";
import styles from "./Ruler.module.css";

function ticksInRange(fromMm: number, toMm: number, stepMm: number): number[] {
	const start = Math.ceil(fromMm / stepMm) * stepMm;
	const out: number[] = [];
	for (let mm = start; mm <= toMm; mm += stepMm) {
		out.push(mm);
	}
	return out;
}

export interface RulerProps {
	axis: "x" | "y";
	lengthMm: number;
	pxPerMm: number;
	offsetPx: number;
	originPx: number;
	highlightRange?: { fromMm: number; toMm: number } | null;
	guideMarks?: number[];
}

export function Ruler({
	axis,
	lengthMm,
	pxPerMm,
	offsetPx,
	originPx,
	highlightRange,
	guideMarks,
}: RulerProps) {
	const from = -PAD_MM;
	const to = lengthMm + PAD_MM;
	const major = ticksInRange(from, to, MAJOR_TICK_MM);
	const minor = ticksInRange(from, to, MINOR_TICK_MM).filter(
		(mm) => mm % MAJOR_TICK_MM !== 0,
	);

	// По оси — только координата вдоль линейки (из документа и зума); всё
	// поперёк оси и оформление — в Ruler.module.css через модификатор .x/.y
	const along = (px: number) => (axis === "x" ? { left: px } : { top: px });
	const length = (px: number) =>
		axis === "x" ? { width: px } : { height: px };

	return (
		<div className={`${styles.ruler} ${styles[axis]}`} style={along(-offsetPx)}>
			{highlightRange && (
				<div
					className={styles.highlight}
					style={{
						...along(originPx + highlightRange.fromMm * pxPerMm),
						...length((highlightRange.toMm - highlightRange.fromMm) * pxPerMm),
					}}
				/>
			)}
			{minor.map((mm) => (
				<div
					key={mm}
					className={styles.minor}
					style={along(originPx + mm * pxPerMm)}
				/>
			))}
			{major.map((mm) => (
				<div
					key={mm}
					className={styles.major}
					style={along(originPx + mm * pxPerMm)}
				>
					<span className={styles.label}>{mm}</span>
				</div>
			))}
			{guideMarks?.map((mm) => {
				// компактная метка — точная позиция редактируется в инспекторе, не тут
				const label = Number.isInteger(mm) ? mm : Math.round(mm * 10) / 10;
				return (
					<div
						key={`guide-${mm}`}
						className={styles.guideMark}
						style={along(originPx + mm * pxPerMm - 1)}
					>
						<span className={styles.guideLabel}>{label}</span>
					</div>
				);
			})}
		</div>
	);
}
