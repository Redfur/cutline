// Вертикальная панель инструментов. Клик по инструменту пока только подсвечивает
// его — добавление элементов на холст это отдельный будущий пункт роадмапа
// («Добавление и удаление элементов, панель инструментов»), сюда ещё не входит.
// Зум внизу панели работает по-настоящему — это часть чеклиста «Холст».
import type { IconProps } from "../ui/core/Icon";
import { IconButton } from "../ui/forms/IconButton";

export type Tool = "select" | "text" | "rect" | "ellipse" | "line" | "image";

const TOOLS: { tool: Tool; icon: IconProps["name"]; label: string }[] = [
	{ tool: "select", icon: "mouse-pointer-2", label: "Выделение" },
	{ tool: "text", icon: "type", label: "Текст" },
	{ tool: "rect", icon: "square", label: "Прямоугольник" },
	{ tool: "ellipse", icon: "circle", label: "Эллипс" },
	{ tool: "line", icon: "slash", label: "Линия" },
	{ tool: "image", icon: "image", label: "Изображение" },
];

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

export interface ToolbarProps {
	tool: Tool;
	onToolChange: (tool: Tool) => void;
	zoom: number;
	onZoomChange: (zoom: number) => void;
	onFitToWindow: () => void;
}

export function Toolbar({
	tool,
	onToolChange,
	zoom,
	onZoomChange,
	onFitToWindow,
}: ToolbarProps) {
	return (
		<div
			style={{
				width: "var(--toolbar-w)",
				flex: "none",
				background: "var(--bg-panel)",
				borderRight: "1px solid var(--border-1)",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				padding: "8px 0",
				gap: 4,
			}}
		>
			{TOOLS.map(({ tool: t, icon, label }) => (
				<IconButton
					key={t}
					icon={icon}
					label={label}
					size="tool"
					active={tool === t}
					onClick={() => onToolChange(t)}
				/>
			))}
			<div style={{ flex: 1 }} />
			<IconButton
				icon="zoom-out"
				label="Уменьшить масштаб"
				onClick={() => onZoomChange(Math.max(MIN_ZOOM, zoom - ZOOM_STEP))}
			/>
			<span style={{ font: "var(--type-label)", color: "var(--fg-2)" }}>
				{Math.round(zoom * 100)}%
			</span>
			<IconButton
				icon="zoom-in"
				label="Увеличить масштаб"
				onClick={() => onZoomChange(Math.min(MAX_ZOOM, zoom + ZOOM_STEP))}
			/>
			<IconButton
				icon="maximize"
				label="По размеру окна"
				onClick={onFitToWindow}
			/>
		</div>
	);
}
