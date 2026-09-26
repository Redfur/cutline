import { useState } from "react";
import { EditorShell } from "./editor/EditorShell/EditorShell";
import { badgeDocument } from "./render/fixtures/badge";
import { Icon } from "./ui/core/Icon";
import { FieldToken } from "./ui/editor/FieldToken";
import { LayerRow } from "./ui/editor/LayerRow";
import { PanelSection } from "./ui/editor/PanelSection";
import { PropertyRow } from "./ui/editor/PropertyRow";
import { RecordNavigator } from "./ui/editor/RecordNavigator";
import { Badge } from "./ui/feedback/Badge";
import { InlineAlert } from "./ui/feedback/InlineAlert";
import { SaveIndicator } from "./ui/feedback/SaveIndicator";
import { Tooltip } from "./ui/feedback/Tooltip";
import { Button } from "./ui/forms/Button";
import { Checkbox } from "./ui/forms/Checkbox";
import { ColorField } from "./ui/forms/ColorField";
import { IconButton } from "./ui/forms/IconButton";
import { SegmentedControl } from "./ui/forms/SegmentedControl";
import { Select } from "./ui/forms/Select";
import { Switch } from "./ui/forms/Switch";
import { TextField } from "./ui/forms/TextField";
import { Dialog } from "./ui/overlays/Dialog";
import { Menu } from "./ui/overlays/Menu";

// Витрина компонентов, перенесённых из Cutline Design System (src/ui/) — временный
// стенд, не часть продукта. EditorShell пока не задействует все 19 компонентов
// (Dialog, Menu, Tooltip, InlineAlert и т.д.) — витрина всё ещё ловит визуальные
// регрессии в тех, что реальный экран ещё не использует. Уберётся, когда компонентов
// без применения в реальном UI не останется.
function UiKitDemo() {
	const [checked, setChecked] = useState(true);
	const [switchOn, setSwitchOn] = useState(false);
	const [select, setSelect] = useState("a6");
	const [segment, setSegment] = useState("design");
	const [color, setColor] = useState("#2f62e8");
	const [recordIndex, setRecordIndex] = useState(1);
	const [menuOpen, setMenuOpen] = useState(false);

	return (
		<section
			style={{
				marginTop: 40,
				paddingTop: 24,
				padding: 24,
				borderTop: "1px solid var(--border-1)",
			}}
		>
			<h2 style={{ font: "var(--type-heading)", margin: "0 0 16px" }}>
				UI-кит (перенесён из Cutline Design System)
			</h2>

			<div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
				<PanelSection
					title="Кнопки"
					style={{ width: 320, border: "1px solid var(--border-1)" }}
				>
					<PropertyRow>
						<Button variant="primary">Экспортировать</Button>
						<Button variant="secondary">Отмена</Button>
						<Button variant="ghost" icon="settings">
							Настройки
						</Button>
					</PropertyRow>
					<PropertyRow>
						<Button variant="warning" size="sm">
							Уменьшать кегль
						</Button>
						<Button variant="danger" size="sm">
							Удалить
						</Button>
						<Tooltip label="Инструмент «Текст»" shortcut="T">
							<IconButton icon="type" label="Текст" />
						</Tooltip>
						<IconButton icon="lock" label="Закрепить" active />
					</PropertyRow>
				</PanelSection>

				<PanelSection
					title="Поля"
					style={{ width: 320, border: "1px solid var(--border-1)" }}
				>
					<PropertyRow label="Имя">
						<TextField value="{{name}}" mono prefixIcon="braces" />
					</PropertyRow>
					<PropertyRow label="Заметка">
						<TextField
							multiline
							placeholder="Короткое описание в две строки."
							rows={2}
						/>
					</PropertyRow>
					<PropertyRow label="Формат" columns={2}>
						<Select
							value={select}
							onChange={setSelect}
							options={[
								{ value: "a6", label: "A6" },
								{ value: "a7", label: "A7" },
							]}
						/>
						<Select
							value="badge"
							onChange={() => {}}
							options={["badge", "визитка", "ценник"]}
						/>
					</PropertyRow>
					<PropertyRow label="Цвет">
						<ColorField
							value={color}
							onChange={setColor}
							swatches={["#2f62e8", "#e08a00", "#d93a3a", "#111111"]}
						/>
					</PropertyRow>
					<PropertyRow>
						<Checkbox
							checked={checked}
							onChange={setChecked}
							label="Показывать линейки"
						/>
					</PropertyRow>
					<PropertyRow>
						<Switch
							checked={switchOn}
							onChange={setSwitchOn}
							label="Вылет и метки реза"
						/>
					</PropertyRow>
				</PanelSection>

				<PanelSection
					title="Статусы"
					style={{ width: 320, border: "1px solid var(--border-1)" }}
				>
					<PropertyRow>
						<SegmentedControl
							value={segment}
							onChange={setSegment}
							fullWidth
							options={[
								{ value: "design", label: "Дизайн" },
								{ value: "data", label: "Данные" },
							]}
						/>
					</PropertyRow>
					<PropertyRow>
						<Badge tone="accent">25 записей</Badge>
						<Badge tone="warning" icon="triangle-alert">
							Не влезает · 118
						</Badge>
						<Badge tone="success">Сохранено</Badge>
					</PropertyRow>
					<PropertyRow>
						<FieldToken name="badgeId" sample="GEN-0001" />
						<FieldToken name="typo" missing />
					</PropertyRow>
					<PropertyRow>
						<SaveIndicator status="saved" />
					</PropertyRow>
					<PropertyRow>
						<InlineAlert
							tone="warning"
							title="Текст не влезает в 3 записях"
							actions={<Button size="sm">Уменьшать кегль</Button>}
						>
							Запись 118. Так же в записях 57, 203.
						</InlineAlert>
					</PropertyRow>
					<PropertyRow>
						<RecordNavigator
							index={recordIndex}
							total={badgeDocument.records.length}
							onPrev={() => setRecordIndex((i) => Math.max(1, i - 1))}
							onNext={() =>
								setRecordIndex((i) =>
									Math.min(badgeDocument.records.length, i + 1),
								)
							}
						/>
					</PropertyRow>
				</PanelSection>

				<PanelSection
					title="Слои и меню"
					style={{ width: 320, border: "1px solid var(--border-1)" }}
				>
					<LayerRow type="text" name="Имя Фамилия" selected />
					<LayerRow type="text" name="Должность" warning />
					<LayerRow type="rect" name="Плашка" locked />
					<LayerRow type="image" name="Фото" hidden />
					<PropertyRow>
						<Menu
							open={menuOpen}
							onOpenChange={setMenuOpen}
							trigger={
								<Button icon="ellipsis" variant="ghost">
									Меню
								</Button>
							}
							items={[
								{ section: "Слой" },
								{ label: "Дублировать", icon: "copy", shortcut: "⌘D" },
								{ label: "Удалить", icon: "trash-2", danger: true },
								{ separator: true },
								{ label: "Заблокировано", checked: true },
							]}
						/>
						<Icon name="ruler" />
						<Icon name="grid-3x3" />
					</PropertyRow>
				</PanelSection>
			</div>

			<div style={{ marginTop: 16 }}>
				<Dialog
					inline
					title="Экспорт"
					footer={<Button variant="primary">Экспортировать 3 карточки</Button>}
					style={{ width: 360 }}
				>
					<PropertyRow label="Формат">
						<SegmentedControl
							value="pdf"
							onChange={() => {}}
							options={[
								{ value: "pdf", label: "PDF" },
								{ value: "svg", label: "SVG" },
								{ value: "png", label: "PNG" },
							]}
						/>
					</PropertyRow>
				</Dialog>
			</div>
		</section>
	);
}

function App() {
	return (
		<div>
			<EditorShell />
			<UiKitDemo />
		</div>
	);
}

export default App;
