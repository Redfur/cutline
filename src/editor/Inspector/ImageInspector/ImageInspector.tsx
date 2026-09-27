// Свойства image. Хранить файлы негде (нет бэкенда) — основной способ прописать
// src это ссылка в текстовом поле, загрузка файла (data URI) — второстепенный,
// но раз файл локальный и его пропорции точно известны, заодно подгоняем размер
// рамки под них.
import { useRef, useState } from "react";
import type {
	DataRecord,
	FieldDef,
	ImageElement,
	ImageFit,
} from "../../../model/document";
import { Icon } from "../../../ui/core/Icon";
import { PanelSection } from "../../../ui/editor/PanelSection";
import { PropertyRow } from "../../../ui/editor/PropertyRow";
import { Button } from "../../../ui/forms/Button";
import { Checkbox } from "../../../ui/forms/Checkbox";
import { ColorField } from "../../../ui/forms/ColorField";
import { Select } from "../../../ui/forms/Select";
import { TextField } from "../../../ui/forms/TextField";
import { ElementErrors, type RecordError } from "../ElementErrors";
import { FieldMenu } from "../FieldMenu";
import { GeometrySection } from "../GeometrySection";
import { LockedFieldset } from "../LockedFieldset";
import { MissingFields } from "../MissingFields";
import styles from "./ImageInspector.module.css";

export interface ImageInspectorProps {
	element: ImageElement;
	onChange: (element: ImageElement) => void;
	fields: FieldDef[];
	record: DataRecord;
	// цвета документа для быстрого выбора фона
	swatches: string[];
	// ошибки функций и не загрузившиеся ссылки по записям
	recordErrors: RecordError[];
}

// белый — самый частый фон под QR-кодом и логотипом с прозрачностью
const DEFAULT_BACKGROUND = "#FFFFFF";

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

// превью в инспекторе — только для конкретного файла/ссылки: у {{photo}} картинка
// своя в каждой записи, её видно на холсте
const HAS_PLACEHOLDER = /\{\{/;

export function ImageInspector({
	element,
	onChange,
	fields,
	record,
	swatches,
	recordErrors,
}: ImageInspectorProps) {
	// ссылка, превью которой не загрузилось: вместо значка «битой» картинки браузера —
	// понятная подпись. По значению src, а не флагом: новая ссылка проверяется заново
	const [failedSrc, setFailedSrc] = useState<string | null>(null);
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
		<>
			<GeometrySection
				element={element}
				onChange={(patch) => onChange({ ...element, ...patch })}
			/>

			<LockedFieldset locked={element.locked}>
				<PanelSection
					title="Источник"
					actions={
						// src целиком заменяется полем: ссылка из ячейки — это и есть весь адрес
						<FieldMenu
							fields={fields}
							record={record}
							target="image"
							onInsert={(text) => onChange({ ...element, src: text })}
						/>
					}
				>
					<TextField
						value={element.src}
						placeholder="https://… или {{photo}}"
						onChange={(v) => onChange({ ...element, src: v })}
					/>
					<MissingFields template={element.src} fields={fields} />
					<ElementErrors
						template={element.src}
						kind="image"
						recordErrors={recordErrors}
					/>

					{HAS_PLACEHOLDER.test(element.src) ? null : element.src &&
						failedSrc !== element.src ? (
						<img
							src={element.src}
							alt=""
							className={styles.imagePreview}
							onError={() => setFailedSrc(element.src)}
						/>
					) : element.src ? (
						<div className={styles.imagePlaceholder}>
							<Icon name="triangle-alert" size={20} />
							Не загрузилась — проверьте ссылку
						</div>
					) : (
						<div className={styles.imagePlaceholder}>
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
						className={styles.fileInput}
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

				<PanelSection
					title="Фон"
					actions={
						<Checkbox
							checked={element.background !== null}
							onChange={(checked) =>
								onChange({
									...element,
									background: checked ? DEFAULT_BACKGROUND : null,
								})
							}
						/>
					}
				>
					{element.background !== null ? (
						<ColorField
							value={element.background}
							showOpacity={false}
							swatches={swatches}
							onChange={(hex) => onChange({ ...element, background: hex })}
						/>
					) : (
						<p className={styles.hint}>
							Прозрачный — видно то, что под картинкой
						</p>
					)}
				</PanelSection>
			</LockedFieldset>
		</>
	);
}
