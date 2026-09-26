// Направляющая, вытянутая с линейки (как в Фигме) — тонкая видимая линия внутри более
// широкого невидимого хитбокса (иначе за 1px мышью не попасть). Без onMouseDown — это
// живое превью во время перетаскивания, не сама направляющая, тянуть его нельзя.

export interface GuideLineProps {
	axis: "x" | "y";
	positionMm: number;
	pxPerMm: number;
	// направляющая рисуется во всю область редактора (не только карточку), поэтому
	// нулевая точка мм — не (0,0) её родителя, а origin{X,Y}Px, как и у Ruler
	originPx: number;
	selected?: boolean;
	onMouseDown?: (e: React.MouseEvent) => void;
}

export function GuideLine({
	axis,
	positionMm,
	pxPerMm,
	originPx,
	selected,
	onMouseDown,
}: GuideLineProps) {
	const posPx = originPx + positionMm * pxPerMm;
	const interactive = Boolean(onMouseDown);
	const thickness = selected ? 2 : 1;
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: перетаскивание мышью, как и остальные хит-таргеты холста рядом (ElementOverlay, маркеры ресайза) — клавиатурного пути нет
		// biome-ignore lint/a11y/useKeyWithClickEvents: см. комментарий выше
		<div
			onMouseDown={onMouseDown}
			// mousedown выше гасит только само перетаскивание; следующий за ним click иначе
			// всплыл бы до contentRef и снял выделение элемента просто от клика по линии
			onClick={interactive ? (e) => e.stopPropagation() : undefined}
			style={{
				position: "absolute",
				pointerEvents: interactive ? "auto" : "none",
				cursor: interactive
					? axis === "x"
						? "ew-resize"
						: "ns-resize"
					: undefined,
				...(axis === "x"
					? { left: posPx - 3, top: 0, width: 6, height: "100%" }
					: { top: posPx - 3, left: 0, height: 6, width: "100%" }),
			}}
		>
			<div
				style={{
					position: "absolute",
					background: "var(--selection)",
					...(axis === "x"
						? {
								left: 3 - (thickness - 1) / 2,
								top: 0,
								width: thickness,
								height: "100%",
							}
						: {
								top: 3 - (thickness - 1) / 2,
								left: 0,
								height: thickness,
								width: "100%",
							}),
				}}
			/>
		</div>
	);
}
