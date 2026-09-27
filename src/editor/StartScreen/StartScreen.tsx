// Стартовый экран «Новый макет» по StartScreen из проекта cutline: шаблоны и пустой
// макет. Показывается, когда документов нет, по «Новый документ» и после удаления
// последнего. Превью — настоящий render() первой записи, как миниатюры в «Данных».
import { useEffect, useMemo } from "react";
import { blankDocument } from "../../render/fixtures/blank";
import { PREVIEW_NO_CHECK, render } from "../../render/render";
import { TEMPLATES, type Template } from "../../templates/templates";
import { Icon } from "../../ui/core/Icon";
import { Button } from "../../ui/forms/Button";
import styles from "./StartScreen.module.css";
import { TemplateCard } from "./TemplateCard";

export interface StartScreenProps {
	// null — пустой макет
	onPick: (template: Template | null) => void;
	// пришли «Новым документом» из открытого — вернуться к нему, ничего не создав
	onBack?: () => void;
	backName?: string;
}

function mm(value: number): string {
	return String(value).replace(".", ",");
}

// Превью вписывается в 180×160 по пропорциям карточки: у SVG из render() есть viewBox
const PREVIEW_MAX_W = 180;
const PREVIEW_MAX_H = 160;

function TemplatePreview({ template }: { template: Template }) {
	const { doc } = template;
	const svg = useMemo(
		() =>
			render(doc, doc.records[0] ?? {}, {
				outlines: null,
				bleed: false,
				n: 1,
				preview: PREVIEW_NO_CHECK,
			}),
		[doc],
	);
	const scale = Math.min(
		PREVIEW_MAX_W / doc.canvas.w,
		PREVIEW_MAX_H / doc.canvas.h,
	);
	return (
		<span
			className={styles.card}
			style={{ width: doc.canvas.w * scale, height: doc.canvas.h * scale }}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: render() выдаёт доверенный SVG из собственного шаблона
			dangerouslySetInnerHTML={{ __html: svg }}
		/>
	);
}

export function StartScreen({ onPick, onBack, backName }: StartScreenProps) {
	const { w, h } = blankDocument.canvas;

	// Esc — как «закрыть»: зашёл посмотреть шаблоны и передумал
	useEffect(() => {
		if (!onBack) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onBack();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onBack]);

	return (
		<div className={styles.screen}>
			<header className={styles.header}>
				<span className={styles.logo}>Cutline</span>
				{onBack && (
					<Button
						variant="ghost"
						size="sm"
						icon="chevron-left"
						onClick={onBack}
					>
						{`Вернуться к «${backName ?? "документу"}»`}
					</Button>
				)}
			</header>
			<main className={styles.main}>
				<div className={styles.content}>
					<div className={styles.intro}>
						<h1 className={styles.title}>Новый макет</h1>
						<p className={styles.subtitle}>
							Выберите шаблон. Макет и поля можно изменить, таблицу с данными —
							загрузить на вкладке «Данные».
						</p>
					</div>
					<div className={styles.grid}>
						{TEMPLATES.map((t) => (
							<TemplateCard
								key={t.id}
								name={t.name}
								size={`${mm(t.doc.canvas.w)} × ${mm(t.doc.canvas.h)} мм`}
								note={t.note}
								fields={t.doc.fields.map((f) => f.key)}
								preview={<TemplatePreview template={t} />}
								onPick={() => onPick(t)}
							/>
						))}
						<TemplateCard
							name="Пустой макет"
							size={`${mm(w)} × ${mm(h)} мм`}
							note="Формат A6, без полей"
							fields={[]}
							preview={
								<span className={styles.blank}>
									<Icon name="plus" size={16} />
								</span>
							}
							onPick={() => onPick(null)}
						/>
					</div>
				</div>
			</main>
		</div>
	);
}
