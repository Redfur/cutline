// Кнопка «Вставить поле» — выпадающий список полей данных (docs/ui-spec.md,
// инспектор текста). Общая для текста и изображения: плейсхолдер в src работает
// так же, как в content. Рядом с плейсхолдером — его значение в текущей записи,
// чтобы по «{{title}}» было видно, что там на самом деле.
import type { DataRecord, FieldDef } from "../../../model/document";
import { Button } from "../../../ui/forms/Button";
import { Menu, type MenuItem } from "../../../ui/overlays/Menu";

export interface FieldMenuProps {
	fields: FieldDef[];
	record: DataRecord;
	onPick: (key: string) => void;
}

// длиннее в узком меню не помещается рядом с плейсхолдером
const HINT_LENGTH = 14;

export function FieldMenu({ fields, record, onPick }: FieldMenuProps) {
	const items: MenuItem[] = fields.length
		? [
				{ section: "Поля данных" },
				...fields.map((f) => ({
					label: `{{${f.key}}}`,
					mono: true,
					hint: (record[f.key] ?? "").slice(0, HINT_LENGTH),
					onSelect: () => onPick(f.key),
				})),
			]
		: [{ label: "Полей нет — добавьте их в «Данных»", disabled: true }];
	return (
		<Menu
			align="right"
			width={236}
			trigger={
				<Button size="sm" variant="ghost" icon="braces">
					Вставить поле
				</Button>
			}
			items={items}
		/>
	);
}
