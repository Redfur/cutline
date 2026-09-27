// Верхний уровень приложения: какой документ открыт и что с документами делают
// (переключить, создать, открыть файл, дублировать, удалить). Сам документ правит
// EditorShell — у каждого документа свой редактор (key={id}) и своя история undo.
//
// Документ читается до монтирования EditorShell: смонтированный с пустым листом
// редактор успел бы записать его поверх того, что человек делал до перезагрузки.
import { useCallback, useEffect, useState } from "react";
import type { CutlineDocument } from "../../model/document";
import { blankDocument } from "../../render/fixtures/blank";
import {
	deleteDocument,
	lastOpenedId,
	listDocuments,
	loadDocument,
	newDocumentId,
	saveDocument,
	type ViewState,
} from "../../storage/documents";
import { EditorShell } from "../EditorShell";
import { EditorSkeleton } from "../EditorSkeleton";
import { ALL_BORDERS } from "../lib/snap";

// IndexedDB обычно отвечает за 10–50 мс: скелетон, мелькнувший на один кадр,
// выглядит хуже короткой пустоты, поэтому показываем его только если ждём дольше
const SKELETON_DELAY_MS = 150;

const DEFAULT_VIEW: ViewState = {
	mode: "design",
	recordIndex: 0,
	borders: ALL_BORDERS,
};

interface Opened {
	id: string;
	doc: CutlineDocument;
	view: ViewState;
	// почему открылся не тот документ, что ждали, — показывается в индикаторе
	notice: string | null;
}

type State =
	| { phase: "loading" }
	| { phase: "ready"; opened: Opened; storageAvailable: boolean };

function fresh(doc: CutlineDocument): Opened {
	return { id: newDocumentId(), doc, view: DEFAULT_VIEW, notice: null };
}

// Первый открывающийся: сначала preferred (последний открытый), потом свежие сверху;
// документов нет — новый пустой лист
async function openFirstAvailable(
	preferred: string | null,
	exclude: string | null = null,
): Promise<Opened> {
	const list = await listDocuments();
	const order = [
		...(preferred ? [preferred] : []),
		...list.map((d) => d.id).filter((id) => id !== preferred),
	].filter((id) => id !== exclude);
	let notice: string | null = null;
	for (const id of order) {
		const result = await loadDocument(id);
		if (result.status === "ok") {
			const { doc, view } = result.stored;
			return { id, doc, view, notice };
		}
		if (result.status === "invalid" && id === preferred) {
			notice = `Сохранённый документ не открылся: ${result.reason}`;
		}
	}
	return { ...fresh(blankDocument), notice };
}

export function Workspace() {
	const [state, setState] = useState<State>({ phase: "loading" });
	const [slow, setSlow] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const timer = setTimeout(() => setSlow(true), SKELETON_DELAY_MS);
		lastOpenedId()
			.then((last) => openFirstAvailable(last))
			.then((opened) => {
				if (!cancelled)
					setState({ phase: "ready", opened, storageAvailable: true });
			})
			.catch(() => {
				if (!cancelled) {
					setState({
						phase: "ready",
						opened: fresh(blankDocument),
						storageAvailable: false,
					});
				}
			})
			.finally(() => clearTimeout(timer));
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, []);

	const storageAvailable = state.phase === "ready" && state.storageAvailable;
	const show = useCallback(
		(opened: Opened) =>
			setState((s) => (s.phase === "ready" ? { ...s, opened } : s)),
		[],
	);

	// Новый документ записывается сразу, а не с первой правкой: он должен появиться в
	// списке, даже если в нём ничего не меняли (открытый файл, копия, шаблон)
	const create = useCallback(
		async (doc: CutlineDocument) => {
			const opened = fresh(doc);
			if (storageAvailable) {
				await saveDocument({ ...opened, savedAt: Date.now() }).catch(() => {
					// не записался — открываем всё равно, индикатор сохранения скажет о проблеме
				});
			}
			show(opened);
		},
		[storageAvailable, show],
	);

	const report = (error: unknown) => {
		alert(error instanceof Error ? error.message : String(error));
	};

	if (state.phase === "loading") {
		return slow ? <EditorSkeleton /> : null;
	}
	const { opened } = state;

	return (
		<EditorShell
			key={opened.id}
			docId={opened.id}
			initialDoc={opened.doc}
			initialView={opened.view}
			storageAvailable={storageAvailable}
			notice={opened.notice}
			onSwitchDocument={(id) => {
				loadDocument(id)
					.then((result) => {
						if (result.status === "ok") {
							const { doc, view } = result.stored;
							show({ id, doc, view, notice: null });
						} else {
							report(
								result.status === "invalid"
									? `Документ не открылся: ${result.reason}`
									: "Документ не найден — возможно, его удалили в другой вкладке",
							);
						}
					})
					.catch(report);
			}}
			onNewDocument={() => void create(blankDocument).catch(report)}
			onOpenDocument={(doc) => void create(doc).catch(report)}
			onDuplicateDocument={(doc) =>
				void create({ ...doc, name: `${doc.name} — копия` }).catch(report)
			}
			onDeleteDocument={() => {
				// отложенные правки удаляемого редактора, дописанные при размонтировании,
				// хранилище отбросит (deleteDocument помнит удалённые id)
				deleteDocument(opened.id)
					.then(() => openFirstAvailable(null, opened.id))
					.then(show)
					.catch(report);
			}}
		/>
	);
}
