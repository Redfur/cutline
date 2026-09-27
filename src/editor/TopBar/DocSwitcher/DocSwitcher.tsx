// Список документов под именем в шапке (DocSwitcher в макете проекта cutline).
// Строки — из индекса хранилища, миниатюры и признак «не открывается» — из самих
// документов, догружаются после открытия списка. Текущий документ берётся живым из
// редактора: его имя и вид свежее того, что уже легло в хранилище.
import { useEffect, useState } from "react";
import type { CutlineDocument } from "../../../model/document";
import {
	type DocumentSummary,
	deleteDocument,
	listDocuments,
	loadDocument,
} from "../../../storage/documents";
import { TextField } from "../../../ui/forms/TextField";
import { Menu } from "../../../ui/overlays/Menu";
import { relativeTime } from "../../lib/relativeTime";
import { DocRow } from "./DocRow";
import styles from "./DocSwitcher.module.css";

export interface DocSwitcherProps {
	currentId: string;
	currentDoc: CutlineDocument;
	onPick: (id: string) => void;
	onNew: () => void;
	onOpenFile: () => void;
}

// Поиск — когда список перестаёт умещаться без прокрутки (как в макете)
const SEARCH_FROM = 8;

interface Loaded {
	doc: CutlineDocument | null;
	broken: boolean;
}

export function DocSwitcher({
	currentId,
	currentDoc,
	onPick,
	onNew,
	onOpenFile,
}: DocSwitcherProps) {
	const [list, setList] = useState<DocumentSummary[] | null>(null);
	const [loaded, setLoaded] = useState<Record<string, Loaded>>({});
	const [query, setQuery] = useState("");
	const [unavailable, setUnavailable] = useState(false);
	const [version, setVersion] = useState(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: version — перечитать после «Убрать»
	useEffect(() => {
		let alive = true;
		listDocuments()
			.then(async (summaries) => {
				if (!alive) return;
				setList(summaries);
				for (const { id } of summaries) {
					if (id === currentId) continue;
					const result = await loadDocument(id);
					if (!alive) return;
					setLoaded((prev) => ({
						...prev,
						[id]:
							result.status === "ok"
								? { doc: result.stored.doc, broken: false }
								: { doc: null, broken: true },
					}));
				}
			})
			.catch(() => {
				if (alive) {
					setUnavailable(true);
					setList([]);
				}
			});
		return () => {
			alive = false;
		};
	}, [currentId, version]);

	const now = Date.now();
	// новый документ без правок ещё не записан — но он открыт, и в списке он есть
	const rows: DocumentSummary[] = [
		{ id: currentId, name: currentDoc.name, savedAt: now },
		...(list ?? []).filter((d) => d.id !== currentId),
	];
	const q = query.trim().toLowerCase();
	const shown = q ? rows.filter((d) => d.name.toLowerCase().includes(q)) : rows;
	const saved = list?.find((d) => d.id === currentId);

	return (
		<div className={styles.switcher} role="listbox" aria-label="Документы">
			{rows.length >= SEARCH_FROM && (
				<div className={styles.search}>
					<TextField
						prefixIcon="search"
						placeholder={`Поиск по ${rows.length} документам`}
						value={query}
						onChange={setQuery}
					/>
				</div>
			)}
			<div className={styles.list}>
				{shown.map((d) => {
					const current = d.id === currentId;
					const state = current
						? { doc: currentDoc, broken: false }
						: (loaded[d.id] ?? { doc: null, broken: false });
					return (
						<DocRow
							key={d.id}
							name={d.name}
							time={relativeTime(
								current ? (saved?.savedAt ?? now) : d.savedAt,
								now,
							)}
							doc={state.doc}
							broken={state.broken}
							current={current}
							onPick={() => onPick(d.id)}
							onRemove={() => {
								void deleteDocument(d.id).then(() => setVersion((v) => v + 1));
							}}
						/>
					);
				})}
				{shown.length === 0 && (
					<div className={styles.empty}>Ничего не найдено</div>
				)}
				{unavailable && (
					<div className={styles.empty}>
						Хранилище браузера недоступно — другие документы не видны
					</div>
				)}
			</div>
			<div className={styles.footer}>
				<Menu
					style={{ width: "100%", boxShadow: "none", borderRadius: 0 }}
					items={[
						{ label: "Новый документ", icon: "plus", onSelect: onNew },
						{ label: "Открыть файл…", icon: "file-text", onSelect: onOpenFile },
					]}
				/>
			</div>
		</div>
	);
}
