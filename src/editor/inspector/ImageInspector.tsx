// Свойства image. Хранить файлы негде (нет бэкенда) — основной способ прописать
// src это ссылка в текстовом поле, загрузка файла (data URI) — второстепенный,
// но раз файл локальный и его пропорции точно известны, заодно подгоняем размер
// рамки под них.
import { useRef } from "react";
import type { ImageElement, ImageFit } from "../../model/document";
import { Icon } from "../../ui/core/Icon";
import { PanelSection } from "../../ui/editor/PanelSection";
import { PropertyRow } from "../../ui/editor/PropertyRow";
import { Button } from "../../ui/forms/Button";
import { Select } from "../../ui/forms/Select";
import { TextField } from "../../ui/forms/TextField";
import { PositionSizeFields } from "./PositionSizeFields";

export interface ImageInspectorProps {
	element: ImageElement;
	onChange: (element: ImageElement) => void;
}

const FIT_OPTIONS: { value: ImageFit; label: string }[] = [
	{ value: "cover", label: "Заполнить (обрезать)" },
	{ value: "contain", label: "Вписать целиком" },
	{ value: "fill", label: "Растянуть" },
];

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

function loadNaturalSize(src: string): Promise<{ w: number; h: number }> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
		img.onerror = () => reject(new Error("не удалось загрузить изображение"));
		img.src = src;
	});
}

export function ImageInspector({ element, onChange }: ImageInspectorProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	async function handleFileSelected(file: File) {
		const src = await readFileAsDataUrl(file);
		try {
			const natural = await loadNaturalSize(src);
			const scale =
				Math.max(element.w, element.h) / Math.max(natural.w, natural.h);
			const w = natural.w * scale;
			const h = natural.h * scale;
			const cx = element.x + element.w / 2;
			const cy = element.y + element.h / 2;
			onChange({ ...element, src, w, h, x: cx - w / 2, y: cy - h / 2 });
		} catch {
			// не смогли измерить пропорции — не страшно, оставляем текущий размер рамки
			onChange({ ...element, src });
		}
	}

	return (
		<PanelSection title={element.name}>
			<PositionSizeFields
				x={element.x}
				y={element.y}
				w={element.w}
				h={element.h}
				onChange={(patch) => onChange({ ...element, ...patch })}
			/>

			<PropertyRow label="Источник">
				<TextField
					value={element.src}
					placeholder="https://…"
					onChange={(v) => onChange({ ...element, src: v })}
				/>
			</PropertyRow>

			{element.src ? (
				<img
					src={element.src}
					alt=""
					style={{
						width: "100%",
						height: 80,
						objectFit: "contain",
						borderRadius: "var(--radius-control)",
						border: "1px solid var(--border-1)",
						background: "var(--bg-subtle)",
					}}
				/>
			) : (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: 4,
						height: 80,
						borderRadius: "var(--radius-control)",
						border: "1px dashed var(--border-2)",
						color: "var(--fg-3)",
						font: "var(--type-label)",
					}}
				>
					<Icon name="image" size={20} />
					Вставьте ссылку или загрузите файл
				</div>
			)}

			<Button
				variant="ghost"
				size="sm"
				fullWidth
				icon="image"
				onClick={() => fileInputRef.current?.click()}
			>
				Загрузить файл
			</Button>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				style={{ display: "none" }}
				onChange={(e) => {
					const file = e.target.files?.[0];
					e.target.value = ""; // разрешить повторный выбор того же файла
					if (file) void handleFileSelected(file);
				}}
			/>

			<PropertyRow label="Вписать">
				<Select
					value={element.fit}
					onChange={(v) => onChange({ ...element, fit: v as ImageFit })}
					options={FIT_OPTIONS}
				/>
			</PropertyRow>
		</PanelSection>
	);
}
