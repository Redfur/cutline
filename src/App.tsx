import { useState } from "react";
import { downloadDocument, openDocumentFile } from "./export/document";
import { downloadPng } from "./export/png";
import { downloadSvg } from "./export/svg";
import type { CutlineDocument, DataRecord } from "./model/document";
import { badgeDocument } from "./render/fixtures/badge";
import { render, renderedSize } from "./render/render";
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

// Рабочий стенд для ручной проверки render()/экспорта/сохранения в браузере
// (Этап 1 роадмапа) — не редактор. Настоящий интерфейс соберётся на Этапе 2 по
// мокапам Cutline Design System (см. CLAUDE.md). Компонент будет удалён, когда
// появится реальный UI.

const RENDER_OPTS = { outlines: false, bleed: false, marks: false };

function slug(text: string): string {
	return (text || "badge")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^\wа-яё-]/gi, "");
}

function BadgeCard({
	doc,
	record,
}: {
	doc: CutlineDocument;
	record: DataRecord;
}) {
	const svg = render(doc, record, RENDER_OPTS);
	const { widthMm, heightMm } = renderedSize(doc.canvas, RENDER_OPTS);
	const name = slug(record.name ?? "");

	return (
		<div style={{ width: `${doc.canvas.w * 3}px` }}>
			<div
				className="badge-preview-card"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: render() выдаёт доверенный SVG из собственной фикстуры
				dangerouslySetInnerHTML={{ __html: svg }}
			/>
			<div style={{ display: "flex", gap: 8, marginTop: 8 }}>
				<button type="button" onClick={() => downloadSvg(svg, `${name}.svg`)}>
					Скачать SVG
				</button>
				<button
					type="button"
					onClick={() =>
						downloadPng(svg, widthMm, heightMm, 300, `${name}@300dpi.png`)
					}
				>
					Скачать PNG
				</button>
			</div>
		</div>
	);
}

// Витрина компонентов, перенесённых из Cutline Design System (src/ui/) — тоже
// временный стенд, не часть продукта. Проверить, что перенос не сломал вид/типы,
// до того как ими начнёт пользоваться настоящий редактор на Этапе 2.
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
	const [doc, setDoc] = useState<CutlineDocument>(badgeDocument);

	const handleOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		openDocumentFile(file)
			.then(setDoc)
			.catch((err: unknown) => {
				alert(err instanceof Error ? err.message : String(err));
			});
	};

	return (
		<div style={{ padding: 24 }}>
			<div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
				<button
					type="button"
					onClick={() => downloadDocument(doc, "cutline-badge.json")}
				>
					Сохранить документ
				</button>
				<label
					style={{
						border: "1px solid #ccc",
						padding: "4px 8px",
						cursor: "pointer",
					}}
				>
					Загрузить документ…
					<input
						type="file"
						accept="application/json"
						onChange={handleOpen}
						style={{ display: "none" }}
					/>
				</label>
			</div>
			<div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
				{doc.records.map((record, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: фикстура статична, порядок не меняется
					<BadgeCard key={i} doc={doc} record={record} />
				))}
			</div>
			<UiKitDemo />
		</div>
	);
}

export default App;
