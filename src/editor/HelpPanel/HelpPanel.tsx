// Справка — выезжающая панель справа по HelpPanel из проекта cutline (состояние
// help): не модальная, без затемнения — читать и тут же делать. Текст — из
// src/help/content.ts; раскрыт раздел текущего экрана или тот, что просили открыть.
import { useEffect, useRef, useState } from "react";
import { type HelpSection, SECTIONS } from "../../help/content";
import { filterSections } from "../../help/search";
import { PanelSection } from "../../ui/editor/PanelSection";
import { IconButton } from "../../ui/forms/IconButton";
import { TextField } from "../../ui/forms/TextField";
import { HelpItem } from "./HelpItem";
import { HelpKeys } from "./HelpKeys";
import styles from "./HelpPanel.module.css";
import { RichText } from "./RichText";

// что показать: раздел или пункт справки. nonce — чтобы повторный клик по той же
// кнопке ещё раз прокрутил и подсветил пункт
export interface HelpFocus {
	topic: string;
	nonce: number;
}

export interface HelpPanelProps {
	// раздел, раскрытый по умолчанию: тот, что про текущий экран
	context: string;
	focus: HelpFocus | null;
	onClose: () => void;
}

// дольше анимации подсветки в HelpItem.module.css — класс снимаем после неё
const FLASH_MS = 1600;

function sectionOf(topic: string): HelpSection | undefined {
	return SECTIONS.find(
		(s) => s.id === topic || s.items?.some((i) => i.id === topic),
	);
}

export function HelpPanel({ context, focus, onClose }: HelpPanelProps) {
	const [query, setQuery] = useState("");
	const [flash, setFlash] = useState<HelpFocus | null>(null);
	const bodyRef = useRef<HTMLDivElement>(null);

	// Просили конкретный пункт — поиск сбрасываем, иначе пункта может не быть на экране
	useEffect(() => {
		if (!focus) return;
		setQuery("");
		setFlash(focus);
		const timer = setTimeout(() => setFlash(null), FLASH_MS);
		return () => clearTimeout(timer);
	}, [focus]);

	// прокрутка — после того как раздел раскрылся (он перемонтируется по key ниже)
	useEffect(() => {
		if (!flash) return;
		bodyRef.current
			?.querySelector(`[data-topic="${CSS.escape(flash.topic)}"]`)
			?.scrollIntoView({ block: "start", behavior: "smooth" });
	}, [flash]);

	const searching = query.trim() !== "";
	const sections = filterSections(SECTIONS, query);
	const openId = focus ? sectionOf(focus.topic)?.id : context;

	return (
		<aside className={styles.panel} aria-label="Справка">
			<div className={styles.header}>
				<div className={styles.title}>Справка</div>
				<IconButton icon="x" label="Закрыть справку" onClick={onClose} />
			</div>
			<div className={styles.search}>
				<TextField
					prefixIcon="search"
					placeholder="Поиск по справке"
					value={query}
					onChange={setQuery}
				/>
			</div>
			<div ref={bodyRef} className={styles.body}>
				{sections.map((s) => (
					<div key={s.id} data-topic={s.id}>
						<PanelSection
							// PanelSection сам помнит, раскрыт ли он, — новый key раскрывает
							// нужный раздел заново при поиске и при переходе по «i»
							key={`${searching ? "q" : ""}:${openId}:${focus?.nonce ?? 0}`}
							title={s.title}
							collapsible
							defaultOpen={searching || s.id === openId}
						>
							<div className={styles.items}>
								{s.intro && (
									<p className={styles.intro}>
										<RichText text={s.intro} />
									</p>
								)}
								{s.items?.map((item) => (
									<HelpItem
										key={item.id}
										item={item}
										flash={flash?.topic === item.id ? flash.nonce : null}
									/>
								))}
								{s.keys?.map((k) => (
									<div key={k.action} className={styles.keyRow}>
										<span className={styles.keyAction}>{k.action}</span>
										<HelpKeys keys={k.keys} />
									</div>
								))}
							</div>
						</PanelSection>
					</div>
				))}
				{sections.length === 0 && (
					<div className={styles.empty}>Ничего не найдено</div>
				)}
			</div>
		</aside>
	);
}
