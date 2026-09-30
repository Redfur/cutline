// Заполнение прямоугольника по данным — полоска прогресса. Рамка элемента — 100%,
// закрашивается доля из значения (data/progress.ts); включает галочка в шапке, как
// заливку и обводку.
import type {
	DataRecord,
	FieldDef,
	FillDirection,
	RectProgress,
} from "../../../../model/document";
import { PanelSection } from "../../../../ui/editor/PanelSection";
import { PropertyRow } from "../../../../ui/editor/PropertyRow";
import { Checkbox } from "../../../../ui/forms/Checkbox";
import { SegmentedControl } from "../../../../ui/forms/SegmentedControl";
import { TextField } from "../../../../ui/forms/TextField";
import { HelpButton } from "../../../HelpButton";
import { ElementErrors, type RecordError } from "../../ElementErrors";
import { FieldMenu } from "../../FieldMenu";
import { MissingFields } from "../../MissingFields";
import styles from "./ProgressSection.module.css";

export interface ProgressSectionProps {
	progress: RectProgress | null;
	onChange: (progress: RectProgress | null) => void;
	fields: FieldDef[];
	record: DataRecord;
	recordErrors: RecordError[];
}

// 100, а не пусто: только что включённая полоска не должна пропасть с холста
const DEFAULT_PROGRESS: RectProgress = { value: "100", direction: "right" };

const DIRECTIONS: { value: FillDirection; label: string; title: string }[] = [
	{ value: "right", label: "→", title: "Слева направо" },
	{ value: "left", label: "←", title: "Справа налево" },
	{ value: "up", label: "↑", title: "Снизу вверх" },
	{ value: "down", label: "↓", title: "Сверху вниз" },
];

export function ProgressSection({
	progress,
	onChange,
	fields,
	record,
	recordErrors,
}: ProgressSectionProps) {
	return (
		<PanelSection
			title="Заполнение по данным"
			actions={
				<>
					<HelpButton topic="progress" />
					<Checkbox
						checked={progress !== null}
						onChange={(checked) => onChange(checked ? DEFAULT_PROGRESS : null)}
					/>
				</>
			}
		>
			{progress && (
				<>
					{/* «Вставить поле» — в строке значения, а не в шапке: с ним длинный
					    заголовок секции не помещается в ширину инспектора */}
					<PropertyRow>
						<div className={styles.value}>
							<TextField
								value={progress.value}
								placeholder="0–100 или {{поле}}"
								onChange={(v) => onChange({ ...progress, value: String(v) })}
							/>
						</div>
						{/* значение целиком заменяется полем: число из ячейки — это и есть доля */}
						<FieldMenu
							fields={fields}
							record={record}
							target="text"
							onInsert={(value) => onChange({ ...progress, value })}
						/>
					</PropertyRow>
					<MissingFields template={progress.value} fields={fields} />
					<ElementErrors
						template={progress.value}
						kind="text"
						recordErrors={recordErrors}
					/>
					<PropertyRow label="Растёт">
						<SegmentedControl
							fullWidth
							value={progress.direction}
							onChange={(v) =>
								onChange({ ...progress, direction: v as FillDirection })
							}
							options={DIRECTIONS}
						/>
					</PropertyRow>
				</>
			)}
		</PanelSection>
	);
}
