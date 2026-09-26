// «Экспорт тиража» по макету дизайн-системы (ExportDialog в ui_kits/editor/DataView.jsx):
// формат, раскладка, записи, метки реза и вылет. Сборку делает export/batch.ts —
// диалог только собирает решение и показывает, что пойдёт не так, до нажатия.
import { useState } from "react";
import type { RecordProblems } from "../../data/problems";
import { type ExportFormat, runExport } from "../../export/batch";
import { layoutOptions } from "../../export/imposition";
import { pdfFontProblems } from "../../export/pdfPreflight";
import { BUNDLED_FAMILIES } from "../../fonts/bundled";
import type { CutlineDocument } from "../../model/document";
import { PropertyRow } from "../../ui/editor/PropertyRow";
import { InlineAlert } from "../../ui/feedback/InlineAlert";
import { Button } from "../../ui/forms/Button";
import { Checkbox } from "../../ui/forms/Checkbox";
import { Select } from "../../ui/forms/Select";
import { TextField } from "../../ui/forms/TextField";
import { Dialog } from "../../ui/overlays/Dialog";
import {
	cardsCount,
	chooseCards,
	layoutLabel,
	problemNumbers,
	problemsText,
	type RecordsChoice,
} from "../lib/exportChoice";
import { plural } from "../lib/plural";
import styles from "./ExportDialog.module.css";

export interface ExportDialogProps {
	doc: CutlineDocument;
	// запись на холсте — для «Текущая»
	recordIndex: number;
	// по записям, как в EditorShell (documentProblems)
	problems: RecordProblems[];
	onClose: () => void;
}

const FORMATS = [
	{ value: "pdf", label: "PDF для типографии" },
	{ value: "png", label: "PNG, по файлу на карточку" },
	{ value: "svg", label: "SVG, по файлу на карточку" },
];

export function ExportDialog({
	doc,
	recordIndex,
	problems,
	onClose,
}: ExportDialogProps) {
	const [format, setFormat] = useState<ExportFormat>("pdf");
	const [printMarks, setPrintMarks] = useState(true);
	const [layoutId, setLayoutId] = useState("A4");
	const [recordsChoice, setRecordsChoice] = useState<RecordsChoice>("all");
	const [rangeText, setRangeText] = useState("");
	const [progress, setProgress] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	const { canvas, records, fields } = doc;
	const options = layoutOptions(canvas, printMarks);
	// A4 с метками вмещает меньше карточек и может пропасть из списка — тогда
	// показываем первый вариант, а выбор человека не перетираем: снимет метки — вернётся
	const layout = options.find((o) => o.id === layoutId) ?? options[0];

	const chosen = chooseCards(
		records,
		fields,
		recordsChoice,
		recordIndex,
		rangeText,
	);
	const cards = chosen.ok ? chosen.cards : [];
	const withProblems = problemNumbers(cards, problems, records.length > 0);
	const fontProblems = format === "pdf" ? pdfFontProblems(doc) : [];
	const busy = progress !== null;
	const ready = chosen.ok && cards.length > 0 && !fontProblems.length && !busy;

	const handleExport = () => {
		if (!chosen.ok) return;
		setError(null);
		setProgress(0);
		runExport({
			doc,
			cards: chosen.cards,
			format,
			layout,
			printMarks,
			onProgress: setProgress,
		})
			.then(onClose)
			.catch((err: unknown) => {
				setError(err instanceof Error ? err.message : String(err));
				setProgress(null);
			});
	};

	const current = Math.min(recordIndex, records.length - 1) + 1;
	const bleedLabel = canvas.bleed
		? `Метки реза и вылет ${String(canvas.bleed).replace(".", ",")} мм`
		: "Метки реза";

	return (
		<Dialog
			title="Экспорт тиража"
			// пока собирается файл, закрытие по скриму оборвало бы только интерфейс, не сборку
			onClose={busy ? undefined : onClose}
			width={420}
			footer={
				<>
					<Button onClick={onClose} disabled={busy}>
						Отмена
					</Button>
					<Button
						variant="primary"
						icon="download"
						disabled={!ready}
						onClick={handleExport}
					>
						{busy
							? `Собираю… ${progress} / ${cards.length}`
							: `Экспортировать ${cardsCount(cards.length)}`}
					</Button>
				</>
			}
		>
			{withProblems.length > 0 && (
				<InlineAlert
					title={`Проблемы в ${withProblems.length} ${plural(withProblems.length, "записи", "записях", "записях")}`}
				>
					{problemsText(withProblems)} Текст не влезает или пусто поле из
					макета. Их можно исправить или экспортировать как есть.
				</InlineAlert>
			)}
			{fontProblems.length > 0 && (
				<InlineAlert
					tone="danger"
					title="В PDF попадут только встроенные шрифты"
				>
					{fontProblems.map((p) => (
						<div key={p}>{p}.</div>
					))}
					<div>Выберите встроенный: {BUNDLED_FAMILIES.join(", ")}.</div>
				</InlineAlert>
			)}
			{error && (
				<InlineAlert tone="danger" title="Файл не собран">
					<span className={styles.preline}>{error}</span>
				</InlineAlert>
			)}
			<PropertyRow label="Формат">
				<Select
					value={format}
					options={FORMATS}
					onChange={(v) => setFormat(v as ExportFormat)}
					disabled={busy}
				/>
			</PropertyRow>
			{format === "pdf" && (
				<PropertyRow label="Раскладка">
					<Select
						value={layout.id}
						options={options.map((o) => ({
							value: o.id,
							label: layoutLabel(o),
						}))}
						onChange={setLayoutId}
						disabled={busy}
					/>
				</PropertyRow>
			)}
			{records.length > 0 && (
				<PropertyRow label="Записи">
					<Select
						value={recordsChoice}
						options={[
							{ value: "all", label: `Все ${records.length}` },
							{ value: "current", label: `Текущая, № ${current}` },
							{ value: "range", label: "Диапазон" },
						]}
						onChange={(v) => setRecordsChoice(v as RecordsChoice)}
						disabled={busy}
					/>
				</PropertyRow>
			)}
			{records.length > 0 && recordsChoice === "range" && (
				<PropertyRow label="Номера">
					<div>
						<TextField
							value={rangeText}
							placeholder="1–5, 8"
							warning={!chosen.ok && rangeText.trim() !== ""}
							onChange={setRangeText}
						/>
						{!chosen.ok && rangeText.trim() !== "" && (
							<div className={styles.fieldError}>{chosen.error}</div>
						)}
					</div>
				</PropertyRow>
			)}
			{format === "pdf" && (
				<Checkbox
					checked={printMarks}
					onChange={setPrintMarks}
					label={bleedLabel}
					disabled={busy}
				/>
			)}
		</Dialog>
	);
}
