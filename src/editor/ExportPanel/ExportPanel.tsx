// Панель экспорта по макету проекта cutline (ExportPanel в editor/CutlineEditor.jsx,
// состояние «export»): сайдбар справа поверх редактора, секции настроек, внизу превью
// первого листа и кнопка. Сборку делает export/batch.ts — панель только собирает
// решение и заранее показывает, что пойдёт не так.
import { useEffect, useMemo, useState } from "react";
import type { RecordProblems } from "../../data/problems";
import { type ExportFormat, runExport } from "../../export/batch";
import {
	homeMarginHint,
	type ImposeSettings,
	pageLayout,
	SHEETS,
	sheetFit,
	spaceHint,
} from "../../export/imposition";
import { systemFontTexts } from "../../export/pdfPreflight";
import { sheetPreviewSvg } from "../../export/sheetPreview";
import { BUNDLED_FAMILIES } from "../../fonts/bundled";
import type { CutlineDocument } from "../../model/document";
import { render } from "../../render/render";
import { PanelSection } from "../../ui/editor/PanelSection";
import { PropertyRow } from "../../ui/editor/PropertyRow";
import { Badge } from "../../ui/feedback/Badge";
import { InlineAlert } from "../../ui/feedback/InlineAlert";
import { Button } from "../../ui/forms/Button";
import { Checkbox } from "../../ui/forms/Checkbox";
import { IconButton } from "../../ui/forms/IconButton";
import { SegmentedControl } from "../../ui/forms/SegmentedControl";
import { Select } from "../../ui/forms/Select";
import { Switch } from "../../ui/forms/Switch";
import {
	chooseCards,
	type ExportWhat,
	exportButtonLabel,
	fitToMarginLabel,
	marginHintText,
	pagesText,
	perSheetText,
	previewCaption,
	problemNumbers,
	problemsText,
	problemsTitle,
	sheetLabel,
	spaceHintAction,
	spaceHintText,
} from "../lib/exportChoice";
import styles from "./ExportPanel.module.css";

export interface ExportPanelProps {
	doc: CutlineDocument;
	// по записям, как в EditorShell (documentProblems)
	problems: RecordProblems[];
	onClose: () => void;
	// «Показать в данных» у плашки проблем
	onShowProblems: () => void;
}

// Лист, как он уйдёт в PDF, или первая карточка SVG/PNG — настоящий render(), как миниатюры
function firstSheetPreview(
	doc: CutlineDocument,
	what: ExportWhat,
	settings: ImposeSettings,
	pdf: boolean,
): string {
	const pageSettings: ImposeSettings = pdf
		? settings
		: {
				sheet: null,
				bleed: false,
				marks: false,
				homeMargin: false,
				fitToMargin: false,
			};
	const layout = pageLayout(doc.canvas, pageSettings);
	const cards = chooseCards(doc.records, doc.fields, what).slice(
		0,
		layout.slots.length,
	);
	return sheetPreviewSvg(
		layout,
		cards.map((c) =>
			render(doc, c.record, { outlines: null, bleed: pageSettings.bleed }),
		),
		"var(--guide-trim)",
	);
}

const DPI_OPTIONS = [
	{ value: "150", label: "150 dpi, черновик" },
	{ value: "300", label: "300 dpi, типография" },
	{ value: "600", label: "600 dpi" },
];

export function ExportPanel({
	doc,
	problems,
	onClose,
	onShowProblems,
}: ExportPanelProps) {
	const { canvas, records, fields } = doc;
	// без записей экспортировать «все» нечего — сразу макет
	const [what, setWhat] = useState<ExportWhat>(
		records.length ? "all" : "layout",
	);
	const [format, setFormat] = useState<ExportFormat>("pdf");
	const [bleed, setBleed] = useState(true);
	const [marks, setMarks] = useState(true);
	const [svgCurves, setSvgCurves] = useState(false);
	const [dpi, setDpi] = useState("300");
	const [impose, setImpose] = useState<"one" | "multi">("multi");
	const [sheetName, setSheetName] = useState("A4");
	const [homeMargin, setHomeMargin] = useState(false);
	const [fitToMargin, setFitToMargin] = useState(false);
	const [progress, setProgress] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const busy = progress !== null;

	// пока собирается файл, закрытие оборвало бы только интерфейс, не сборку
	const close = busy ? () => {} : onClose;
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !busy) onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [busy, onClose]);

	const pdf = format === "pdf";
	const sheet = SHEETS.find((s) => s.name === sheetName) ?? SHEETS[0];
	const settings: ImposeSettings = {
		sheet: pdf && impose === "multi" ? sheet : null,
		bleed: pdf && bleed,
		marks: pdf && marks,
		homeMargin,
		fitToMargin,
	};
	const fit = sheetFit(canvas, settings);
	const hint = homeMarginHint(canvas, settings);
	const space = spaceHint(canvas, settings);

	const cards = chooseCards(records, fields, what);
	const n = cards.length;
	const sheets = fit.perSheet ? Math.ceil(n / fit.perSheet) : 0;
	const withProblems = what === "all" ? problemNumbers(cards, problems) : [];
	const systemTexts =
		pdf || (format === "svg" && svgCurves) ? systemFontTexts(doc) : [];
	const ready =
		n > 0 && fit.perSheet > 0 && !(pdf && systemTexts.length) && !busy;

	// первый лист — тем же спуском, что уйдёт в PDF; SVG/PNG — первая карточка в обрез.
	// Мемо по примитивам: на прогрессе сборки панель перерисовывается на каждую карточку
	const previewSheet = settings.sheet;
	const previewBleed = settings.bleed;
	const previewMarks = settings.marks;
	const preview = useMemo(
		() =>
			firstSheetPreview(
				doc,
				what,
				{
					sheet: previewSheet,
					bleed: previewBleed,
					marks: previewMarks,
					homeMargin,
					fitToMargin,
				},
				pdf,
			),
		[
			doc,
			what,
			pdf,
			previewSheet,
			previewBleed,
			previewMarks,
			homeMargin,
			fitToMargin,
		],
	);

	const handleExport = () => {
		setError(null);
		setProgress(0);
		runExport({
			doc,
			cards,
			layoutOnly: what === "layout",
			format,
			impose: settings,
			curves: svgCurves,
			dpi: Number(dpi),
			onProgress: setProgress,
		})
			.then(onClose)
			.catch((err: unknown) => {
				setError(err instanceof Error ? err.message : String(err));
				setProgress(null);
			});
	};

	return (
		<>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: затемнение закрывает панель кликом мимо неё, с клавиатуры — Esc */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: см. выше — Esc обрабатывается на window */}
			<div className={styles.scrim} onClick={close} />
			<section className={styles.panel} aria-label="Экспорт">
				<header className={styles.header}>
					<h2 className={styles.title}>Экспорт</h2>
					<IconButton icon="x" label="Закрыть" onClick={close} />
				</header>

				<div className={styles.body}>
					{(withProblems.length > 0 || systemTexts.length > 0 || error) && (
						<div className={styles.alerts}>
							{withProblems.length > 0 && (
								<InlineAlert
									title={problemsTitle(withProblems, problems)}
									actions={
										<Button
											size="sm"
											variant="warning"
											onClick={onShowProblems}
											disabled={busy}
										>
											Показать в данных
										</Button>
									}
								>
									{problemsText(withProblems)}
								</InlineAlert>
							)}
							{systemTexts.length > 0 && (
								<InlineAlert
									tone={pdf ? "danger" : "warning"}
									title={
										pdf
											? "В PDF попадут только встроенные шрифты"
											: "Системный шрифт останется текстом"
									}
								>
									{systemTexts.map((el) => (
										<div key={el.id}>
											«{el.name}» — {el.font || "шрифт без названия"}
										</div>
									))}
									<div>
										{pdf
											? "Системные шрифты в PDF не попадают."
											: "В кривые переводятся только встроенные шрифты."}{" "}
										Выберите встроенный: {BUNDLED_FAMILIES.join(", ")}.
									</div>
								</InlineAlert>
							)}
							{error && (
								<InlineAlert tone="danger" title="Файл не собран">
									<span className={styles.preline}>{error}</span>
								</InlineAlert>
							)}
						</div>
					)}

					<PanelSection title="Что экспортируем" collapsible defaultOpen>
						<SegmentedControl
							fullWidth
							value={what}
							onChange={(v) => setWhat(v as ExportWhat)}
							options={[
								{
									value: "all",
									label: `Все · ${records.length}`,
									disabled: !records.length,
								},
								// выбора нескольких записей в таблице пока нет
								{
									value: "selected",
									label: "Выбранные",
									disabled: true,
									title: "Выбор записей в таблице появится позже",
								},
								{ value: "layout", label: "Только макет" },
							]}
						/>
					</PanelSection>

					<PanelSection title="Формат" collapsible defaultOpen>
						<SegmentedControl
							fullWidth
							value={format}
							onChange={(v) => setFormat(v as ExportFormat)}
							options={[
								{ value: "pdf", label: "PDF" },
								{ value: "svg", label: "SVG" },
								{ value: "png", label: "PNG" },
							]}
						/>
					</PanelSection>

					<PanelSection
						title={`Параметры ${format.toUpperCase()}`}
						collapsible
						defaultOpen
					>
						<div className={styles.column}>
							{pdf && (
								<>
									<Checkbox
										checked={bleed}
										onChange={setBleed}
										label={`Вылет ${String(canvas.bleed).replace(".", ",")} мм`}
									/>
									<Checkbox
										checked={marks}
										onChange={setMarks}
										label="Метки реза"
									/>
									<Checkbox checked disabled label="Текст в кривых" />
									<div className={styles.note}>
										В PDF текст всегда в кривых: вшивать шрифты в файл Cutline
										пока не умеет.
									</div>
								</>
							)}
							{format === "svg" && (
								<Checkbox
									checked={svgCurves}
									onChange={setSvgCurves}
									label="Текст в кривых"
								/>
							)}
							{format === "png" && (
								<PropertyRow label="Разрешение">
									<Select value={dpi} onChange={setDpi} options={DPI_OPTIONS} />
								</PropertyRow>
							)}
							{!pdf && (
								<div className={styles.note}>
									Каждая карточка — отдельный файл. Файлы придут одним архивом
									ZIP.
								</div>
							)}
						</div>
					</PanelSection>

					{pdf && (
						<>
							<PanelSection title="Спуск полос" collapsible defaultOpen>
								<div className={styles.column}>
									<SegmentedControl
										fullWidth
										value={impose}
										onChange={(v) => setImpose(v as "one" | "multi")}
										options={[
											{ value: "one", label: "Одна на страницу" },
											{ value: "multi", label: "Несколько на листе" },
										]}
									/>
									{impose === "multi" && (
										<>
											<PropertyRow label="Лист">
												<Select
													value={sheet.name}
													onChange={setSheetName}
													options={SHEETS.map((s) => ({
														value: s.name,
														label: sheetLabel(s),
													}))}
												/>
											</PropertyRow>
											<div className={styles.switchRow}>
												<Switch
													checked={homeMargin}
													onChange={setHomeMargin}
													label="Поля для домашнего принтера"
												/>
												<div className={styles.switchNote}>
													Отступ 5 мм от края листа — для принтеров, которые не
													печатают в край.
												</div>
												{hint && (
													<div className={styles.hint}>
														<span>{marginHintText(hint)}</span>
														<Checkbox
															checked={fitToMargin}
															onChange={setFitToMargin}
															label={fitToMarginLabel(hint)}
														/>
													</div>
												)}
											</div>
											<div className={styles.summary}>
												{fit.perSheet > 0 ? (
													<span>{perSheetText(fit.perSheet, sheets)}</span>
												) : (
													<span className={styles.warn}>
														Карточка не помещается на лист {sheet.name}
													</span>
												)}
											</div>
											{space && (
												<div className={styles.spaceHint}>
													<span>{spaceHintText(space)}</span>
													<Button
														size="sm"
														onClick={() => {
															if (space.drop !== "marks") setBleed(false);
															if (space.drop !== "bleed") setMarks(false);
														}}
													>
														{spaceHintAction(space)}
													</Button>
												</div>
											)}
										</>
									)}
								</div>
							</PanelSection>

							<PanelSection
								title="Двусторонняя печать"
								actions={<Badge>скоро</Badge>}
								collapsible
								defaultOpen={false}
							>
								<div className={styles.column}>
									<Switch disabled label="Оборот в том же файле" />
									<div className={styles.note}>
										У макета пока одна сторона — оборот появится вместе с его
										редактированием.
									</div>
								</div>
							</PanelSection>
						</>
					)}
				</div>

				<footer className={styles.footer}>
					<div
						className={styles.preview}
						// biome-ignore lint/security/noDangerouslySetInnerHtml: превью собрано из render() — доверенный SVG собственного документа, как миниатюры
						dangerouslySetInnerHTML={{ __html: preview }}
					/>
					<div className={styles.caption}>
						<span className={styles.captionMain}>
							{previewCaption(format, settings.sheet, fit, n, Number(dpi))}
						</span>
						<span className={styles.muted}>
							{pagesText(format, pdf ? sheets : n)}
						</span>
					</div>
					<div className={styles.action}>
						<Button
							variant="primary"
							size="lg"
							icon="download"
							fullWidth
							disabled={!ready}
							onClick={handleExport}
						>
							{busy
								? `Собираю… ${progress} / ${n}`
								: exportButtonLabel(what, n)}
						</Button>
					</div>
				</footer>
			</section>
		</>
	);
}
