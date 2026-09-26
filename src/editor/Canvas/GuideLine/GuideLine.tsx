// Направляющая, вытянутая с линейки (как в Фигме) — тонкая видимая линия внутри более
// широкого невидимого хитбокса (иначе за 1px мышью не попасть). Без onMouseDown — это
// живое превью во время перетаскивания, не сама направляющая, тянуть его нельзя.
import styles from "./GuideLine.module.css";

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
	const className = [
		styles.hitbox,
		styles[axis],
		interactive && styles.interactive,
		selected && styles.selected,
	]
		.filter(Boolean)
		.join(" ");
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: перетаскивание мышью, как и остальные хит-таргеты холста рядом (ElementOverlay, маркеры ресайза) — клавиатурного пути нет
		// biome-ignore lint/a11y/useKeyWithClickEvents: см. комментарий выше
		<div
			onMouseDown={onMouseDown}
			// mousedown выше гасит только само перетаскивание; следующий за ним click иначе
			// всплыл бы до contentRef и снял выделение элемента просто от клика по линии
			onClick={interactive ? (e) => e.stopPropagation() : undefined}
			className={className}
			style={axis === "x" ? { left: posPx - 3 } : { top: posPx - 3 }}
		>
			<div className={styles.line} />
		</div>
	);
}
