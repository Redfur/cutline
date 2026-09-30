// Условие показа по данным — у одного элемента и у нескольких выделенных сразу:
// текст {{Должность}} и его плашка получают одно условие и исчезают вместе.
// Включает галочка в шапке, как заливку и обводку.
import type {
	DataRecord,
	FieldDef,
	ShowCondition,
} from "../../../model/document";
import { PanelSection } from "../../../ui/editor/PanelSection";
import { PropertyRow } from "../../../ui/editor/PropertyRow";
import { Checkbox } from "../../../ui/forms/Checkbox";
import { SegmentedControl } from "../../../ui/forms/SegmentedControl";
import { TextField } from "../../../ui/forms/TextField";
import { HelpButton } from "../../HelpButton";
import { ElementErrors, type RecordError } from "../ElementErrors";
import { FieldMenu } from "../FieldMenu";
import { MissingFields } from "../MissingFields";
import styles from "./ConditionSection.module.css";

export interface ConditionSectionProps {
	condition: ShowCondition | null;
	// у выделенных разные условия: правка задаст одно на все
	mixed: boolean;
	onChange: (condition: ShowCondition | null) => void;
	// значение для только что включённого условия — первое поле содержимого
	suggestedValue: string;
	fields: FieldDef[];
	record: DataRecord;
	recordErrors: RecordError[];
}

const WHEN_OPTIONS: { value: ShowCondition["when"]; label: string }[] = [
	{ value: "filled", label: "Заполнено" },
	{ value: "empty", label: "Пусто" },
];

export function ConditionSection({
	condition,
	mixed,
	onChange,
	suggestedValue,
	fields,
	record,
	recordErrors,
}: ConditionSectionProps) {
	return (
		<PanelSection
			title="Показывать, если"
			actions={
				<>
					<HelpButton topic="conditions" />
					<Checkbox
						checked={condition !== null}
						indeterminate={mixed}
						onChange={(checked) =>
							onChange(
								checked && !mixed
									? { value: suggestedValue, when: "filled" }
									: null,
							)
						}
					/>
				</>
			}
		>
			{mixed && (
				<p className={styles.hint}>
					У выделенных разные условия — правка задаст одно на все
				</p>
			)}
			{condition && (
				<>
					{/* «Вставить поле» — в строке значения: в шапке уже справка и галочка */}
					<PropertyRow>
						<div className={styles.value}>
							<TextField
								value={condition.value}
								placeholder="{{поле}}"
								onChange={(v) => onChange({ ...condition, value: String(v) })}
							/>
						</div>
						{/* значение целиком заменяется полем: условие — про одно поле */}
						<FieldMenu
							fields={fields}
							record={record}
							target="text"
							onInsert={(value) => onChange({ ...condition, value })}
						/>
					</PropertyRow>
					<SegmentedControl
						fullWidth
						value={condition.when}
						onChange={(v) =>
							onChange({ ...condition, when: v as ShowCondition["when"] })
						}
						options={WHEN_OPTIONS}
					/>
					<MissingFields template={condition.value} fields={fields} />
					<ElementErrors
						template={condition.value}
						kind="text"
						recordErrors={recordErrors}
					/>
				</>
			)}
		</PanelSection>
	);
}
