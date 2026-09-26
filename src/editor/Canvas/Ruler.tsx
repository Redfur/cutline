import { MAJOR_TICK_MM, MINOR_TICK_MM, PAD_MM, RULER_SIZE } from "./constants";

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

	return (
		<div
			style={{
				position: "absolute",
				...(axis === "x"
					? { left: -offsetPx, top: 0, height: "100%" }
					: { top: -offsetPx, left: 0, width: "100%" }),
			}}
		>
			{highlightRange && (
				<div
					style={{
						position: "absolute",
						background: "var(--bg-selected)",
						...(axis === "x"
							? {
									left: originPx + highlightRange.fromMm * pxPerMm,
									width:
										(highlightRange.toMm - highlightRange.fromMm) * pxPerMm,
									top: 0,
									height: "100%",
								}
							: {
									top: originPx + highlightRange.fromMm * pxPerMm,
									height:
										(highlightRange.toMm - highlightRange.fromMm) * pxPerMm,
									left: 0,
									width: "100%",
								}),
					}}
				/>
			)}
			{minor.map((mm) => {
				const posPx = originPx + mm * pxPerMm;
				return (
					<div
						key={mm}
						style={{
							position: "absolute",
							background: "var(--border-2)",
							...(axis === "x"
								? { left: posPx, top: RULER_SIZE - 5, width: 1, height: 5 }
								: { top: posPx, left: RULER_SIZE - 5, height: 1, width: 5 }),
						}}
					/>
				);
			})}
			{major.map((mm) => {
				const posPx = originPx + mm * pxPerMm;
				return (
					<div
						key={mm}
						style={{
							position: "absolute",
							...(axis === "x"
								? { left: posPx, top: 0, width: 1, height: RULER_SIZE }
								: { top: posPx, left: 0, height: 1, width: RULER_SIZE }),
							background: "var(--border-2)",
						}}
					>
						<span
							style={{
								position: "absolute",
								font: "var(--type-label)",
								color: "var(--fg-3)",
								...(axis === "x" ? { left: 3, top: 1 } : { top: 3, left: 2 }),
							}}
						>
							{mm}
						</span>
					</div>
				);
			})}
			{guideMarks?.map((mm) => {
				const posPx = originPx + mm * pxPerMm;
				// компактная метка — точная позиция редактируется в инспекторе, не тут
				const label = Number.isInteger(mm) ? mm : Math.round(mm * 10) / 10;
				return (
					<div
						key={`guide-${mm}`}
						style={{
							position: "absolute",
							pointerEvents: "none",
							...(axis === "x"
								? { left: posPx - 1, top: 0, width: 2, height: RULER_SIZE }
								: { top: posPx - 1, left: 0, height: 2, width: RULER_SIZE }),
							background: "var(--selection)",
						}}
					>
						<span
							style={{
								position: "absolute",
								font: "var(--type-label)",
								fontWeight: 600,
								color: "var(--selection)",
								whiteSpace: "nowrap",
								...(axis === "x" ? { left: 3, top: 1 } : { top: 3, left: 4 }),
							}}
						>
							{label}
						</span>
					</div>
				);
			})}
		</div>
	);
}
