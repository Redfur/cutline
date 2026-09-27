// Кнопка «Вставить поле» — выпадающий список полей данных (docs/ui-spec.md,
// инспектор текста) и встроенных функций. Общая для текста и изображения:
// плейсхолдер в src работает так же, как в content. Рядом с плейсхолдером — его
// значение в текущей записи, чтобы по «{{title}}» было видно, что там на самом деле.
import { FUNCTIONS } from "../../../data/functions";
import type { DataRecord, FieldDef } from "../../../model/document";
import { Button } from "../../../ui/forms/Button";
import { Menu, type MenuItem } from "../../../ui/overlays/Menu";
import { useHelp } from "../../lib/help";

export interface FieldMenuProps {
	fields: FieldDef[];
	record: DataRecord;
	// функции для текста или для источника картинки (qr)
	target: "text" | "image";
	// готовый текст для вставки: «{{name}}» или заготовка функции
	onInsert: (text: string) => void;
}

// длиннее в узком меню не помещается рядом с плейсхолдером
const HINT_LENGTH = 14;

export function FieldMenu({
	fields,
	record,
	target,
	onInsert,
}: FieldMenuProps) {
	const fieldItems: MenuItem[] = fields.length
		? fields.map((f) => ({
				label: `{{${f.key}}}`,
				mono: true,
				hint: (record[f.key] ?? "").slice(0, HINT_LENGTH),
				onSelect: () => onInsert(`{{${f.key}}}`),
			}))
		: [{ label: "Полей нет — добавьте их в «Данных»", disabled: true }];
	// «поле» в заготовке — первое поле документа: вставленное сразу работает, а
	// не показывает «нет поля»
	const help = useHelp();
	const sampleKey = fields[0]?.key ?? "поле";
	const functionItems: MenuItem[] = Object.values(FUNCTIONS)
		.filter((fn) => fn.target === target)
		.map((fn) => {
			const snippet = fn.snippet.replace("поле", sampleKey);
			return {
				label: snippet,
				mono: true,
				hint: fn.hint,
				onSelect: () => onInsert(snippet),
			};
		});
	return (
		<Menu
			align="right"
			// шире сайдбара инспектора нельзя: меню открывается от правого края кнопки,
			// и лишнее обрезается слева вместе с заголовками разделов
			width={264}
			trigger={
				<Button size="sm" variant="ghost" icon="braces">
					Вставить поле
				</Button>
			}
			items={[
				{ section: "Поля данных" },
				...fieldItems,
				{ section: "Функции" },
				...functionItems,
				{ separator: true },
				// подсказка в строке меню — пара слов; что делает функция и пример — в справке
				{
					label: "Все функции — в справке",
					icon: "circle-help",
					onSelect: () => help.open("functions"),
				},
			]}
		/>
	);
}
