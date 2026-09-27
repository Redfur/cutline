// Оформление QR-кода: цвет, форма модулей и угловых квадратов («глаз»). Показывается,
// когда источник картинки — {{ qr(…) }}. Под настройками — предупреждение, если с
// таким цветом код может не считаться: на экране он выглядит нормально всегда.
import type { QrStyle } from "../../../../model/document";
import { PanelSection } from "../../../../ui/editor/PanelSection";
import { ColorField } from "../../../../ui/forms/ColorField";
import { SegmentedControl } from "../../../../ui/forms/SegmentedControl";
import { HelpButton } from "../../../HelpButton";
import { qrContrastWarning } from "../../../lib/contrast";
import styles from "./QrSection.module.css";

export interface QrSectionProps {
	style: QrStyle;
	onChange: (style: QrStyle) => void;
	// на чём лежит код: фон картинки или, если он прозрачный, фон холста
	background: string;
	swatches: string[];
}

const MODULES: { value: QrStyle["modules"]; label: string }[] = [
	{ value: "square", label: "Квадраты" },
	{ value: "rounded", label: "Скруглённые" },
	{ value: "dots", label: "Точки" },
];

const EYES: { value: QrStyle["eyes"]; label: string }[] = [
	{ value: "square", label: "Квадрат" },
	{ value: "rounded", label: "Скруглённые" },
	{ value: "circle", label: "Круг" },
];

export function QrSection({
	style,
	onChange,
	background,
	swatches,
}: QrSectionProps) {
	const warning = qrContrastWarning(style.color, background);
	return (
		<PanelSection title="QR-код" actions={<HelpButton topic="qr" />}>
			<ColorField
				value={style.color}
				showOpacity={false}
				swatches={swatches}
				onChange={(color) => onChange({ ...style, color })}
			/>
			{warning && <p className={styles.warning}>{warning}</p>}
			{/* подпись над сегментами, а не слева: три варианта рядом с подписью не
			    помещаются в ширину инспектора и раздвигают его */}
			<div className={styles.field}>
				<span className={styles.caption}>Модули</span>
				<SegmentedControl
					fullWidth
					size="sm"
					value={style.modules}
					options={MODULES}
					onChange={(v) =>
						onChange({ ...style, modules: v as QrStyle["modules"] })
					}
				/>
			</div>
			<div className={styles.field}>
				<span className={styles.caption}>Углы</span>
				<SegmentedControl
					fullWidth
					size="sm"
					value={style.eyes}
					options={EYES}
					onChange={(v) => onChange({ ...style, eyes: v as QrStyle["eyes"] })}
				/>
			</div>
			<p className={styles.hint}>
				Оставьте вокруг кода светлое поле хотя бы в два модуля — фон картинки
				или пустое место на карточке. Контраст считается с фоном картинки или
				холста; то, что лежит под кодом, не учитывается.
			</p>
		</PanelSection>
	);
}
