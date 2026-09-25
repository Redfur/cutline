import { type CSSProperties, useState } from "react";
import type { ElementType } from "../../model/document";
import { Icon, type IconProps } from "../core/Icon";

export interface LayerRowProps {
	type?: ElementType;
	name: string;
	selected?: boolean;
	locked?: boolean;
	hidden?: boolean;
	/** Amber triangle — this text overflows in some records */
	warning?: boolean;
	depth?: number;
	onClick?: () => void;
	onToggleLock?: () => void;
	onToggleVisible?: () => void;
	style?: CSSProperties;
}

const TYPE_ICON: Record<ElementType, IconProps["name"]> = {
	text: "type",
	rect: "square",
	ellipse: "circle",
	line: "slash",
	image: "image",
};

function Tog({
	icon,
	label,
	onClick,
	visible,
}: {
	icon: IconProps["name"];
	label: string;
	onClick?: () => void;
	visible: boolean;
}) {
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			onClick={(e) => {
				e.stopPropagation();
				onClick?.();
			}}
			style={{
				width: 22,
				height: 22,
				border: 0,
				padding: 0,
				borderRadius: "var(--radius-1)",
				background: "transparent",
				color: "var(--fg-2)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				cursor: "pointer",
				visibility: visible ? "visible" : "hidden",
			}}
		>
			<Icon name={icon} size={14} />
		</button>
	);
}

export function LayerRow({
	type = "rect",
	name,
	selected,
	locked,
	hidden,
	warning,
	depth = 0,
	onClick,
	onToggleLock,
	onToggleVisible,
	style,
}: LayerRowProps) {
	const [h, setH] = useState(false);
	return (
		// biome-ignore lint/a11y/useFocusableInteractive: role="option" — клавиатурная навигация принадлежит родительскому role="listbox" (roving tabindex), а не отдельной строке; тот список слоёв — Этап 2
		// biome-ignore lint/a11y/useKeyWithClickEvents: см. выше
		<div
			role="option"
			aria-selected={selected}
			onClick={onClick}
			onMouseEnter={() => setH(true)}
			onMouseLeave={() => setH(false)}
			style={{
				display: "flex",
				alignItems: "center",
				gap: 6,
				height: "var(--row-h)",
				padding: `0 4px 0 ${10 + depth * 14}px`,
				background: selected
					? "var(--bg-selected)"
					: h
						? "var(--bg-hover)"
						: "transparent",
				boxShadow: selected ? "inset 2px 0 0 var(--selection)" : "none",
				cursor: "default",
				userSelect: "none",
				...style,
			}}
		>
			<span
				style={{
					color: selected ? "var(--fg-accent)" : "var(--fg-3)",
					opacity: hidden ? 0.5 : 1,
				}}
			>
				<Icon name={TYPE_ICON[type] || "square"} size={14} />
			</span>
			<span
				style={{
					flex: 1,
					minWidth: 0,
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
					font: selected
						? "500 var(--text-sm)/1 var(--font-ui)"
						: "var(--type-body)",
					color: hidden ? "var(--fg-3)" : "var(--fg-1)",
				}}
			>
				{name}
			</span>
			{warning && (
				<span
					title="Текст не влезает"
					style={{ color: "var(--overflow)", display: "flex" }}
				>
					<Icon name="triangle-alert" size={14} strokeWidth={2} />
				</span>
			)}
			<Tog
				icon={locked ? "lock" : "lock-open"}
				label={locked ? "Открепить" : "Закрепить"}
				onClick={onToggleLock}
				visible={!!locked || h}
			/>
			<Tog
				icon={hidden ? "eye-off" : "eye"}
				label={hidden ? "Показать" : "Скрыть"}
				onClick={onToggleVisible}
				visible={!!hidden || h}
			/>
		</div>
	);
}
