// Кнопка «Вставить поле» — выпадающий список полей данных (docs/ui-spec.md,
// инспектор текста). Общая для текста и изображения: плейсхолдер в src работает
// так же, как в content.
import type { FieldDef } from "../../../model/document";
import { IconButton } from "../../../ui/forms/IconButton";
import { Menu, type MenuItem } from "../../../ui/overlays/Menu";

export interface FieldMenuProps {
	fields: FieldDef[];
	onPick: (key: string) => void;
}

export function FieldMenu({ fields, onPick }: FieldMenuProps) {
	const items: MenuItem[] = fields.length
		? [
				{ section: "Поля данных" },
				...fields.map((f) => ({
					label: f.label,
					hint: `{{${f.key}}}`,
					onSelect: () => onPick(f.key),
				})),
			]
		: [{ label: "Полей нет — добавьте их в «Данных»", disabled: true }];
	return (
		<Menu
			align="right"
			width={240}
			trigger={<IconButton icon="braces" label="Вставить поле" />}
			items={items}
		/>
	);
}
