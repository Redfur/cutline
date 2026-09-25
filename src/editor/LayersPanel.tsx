import type { CutlineElement } from "../model/document";
import { LayerRow } from "../ui/editor/LayerRow";

export interface LayersPanelProps {
	elements: CutlineElement[];
	selectedId: string | null;
	onSelect: (id: string) => void;
}

export function LayersPanel({
	elements,
	selectedId,
	onSelect,
}: LayersPanelProps) {
	return (
		<div
			style={{
				width: "var(--layers-w)",
				flex: "none",
				background: "var(--bg-panel)",
				borderRight: "1px solid var(--border-1)",
				overflowY: "auto",
			}}
		>
			{elements.length === 0 ? (
				<div
					style={{
						padding: "16px 12px",
						font: "var(--type-label)",
						color: "var(--fg-3)",
					}}
				>
					Элементов нет. Добавьте первый через панель инструментов слева.
				</div>
			) : (
				// последний элемент массива рисуется поверх остальных на холсте — значит, он верхний слой в списке
				[...elements]
					.reverse()
					.map((el) => (
						<LayerRow
							key={el.id}
							type={el.type}
							name={el.name}
							locked={el.locked}
							hidden={!el.visible}
							selected={el.id === selectedId}
							onClick={() => onSelect(el.id)}
						/>
					))
			)}
		</div>
	);
}
