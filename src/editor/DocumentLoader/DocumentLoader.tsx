// Читает сохранённую сессию и только потом монтирует редактор. Монтировать
// EditorShell сразу с пустым документом нельзя: автосохранение успело бы записать
// пустой лист поверх того, что человек делал до перезагрузки.
import { useEffect, useState } from "react";
import type { CutlineDocument } from "../../model/document";
import { blankDocument } from "../../render/fixtures/blank";
import {
	lastOpenedId,
	listDocuments,
	loadDocument,
	newDocumentId,
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

type LoaderState =
	| { phase: "loading" }
	| {
			phase: "ready";
			id: string;
			doc: CutlineDocument;
			view: ViewState;
			storageAvailable: boolean;
			// почему открылся пустой лист вместо сохранённого — показывается в индикаторе
			notice: string | null;
	  };

interface Opened {
	id: string;
	doc: CutlineDocument;
	view: ViewState;
	notice: string | null;
}

// Последний открытый документ; не открылся — самый свежий из тех, что открываются;
// документов нет — новый пустой лист
async function openLastDocument(): Promise<Opened> {
	const list = await listDocuments();
	const last = await lastOpenedId();
	const order = [
		...(last ? [last] : []),
		...list.map((d) => d.id).filter((id) => id !== last),
	];
	let notice: string | null = null;
	for (const id of order) {
		const result = await loadDocument(id);
		if (result.status === "ok") {
			const { doc, view } = result.stored;
			return { id, doc, view, notice };
		}
		if (result.status === "invalid" && id === last) {
			notice = `Сохранённый документ не открылся: ${result.reason}`;
		}
	}
	return {
		id: newDocumentId(),
		doc: blankDocument,
		view: DEFAULT_VIEW,
		notice,
	};
}

export function DocumentLoader() {
	const [state, setState] = useState<LoaderState>({ phase: "loading" });
	const [slow, setSlow] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const timer = setTimeout(() => setSlow(true), SKELETON_DELAY_MS);
		openLastDocument()
			.then((result) => {
				if (cancelled) return;
				setState({ phase: "ready", storageAvailable: true, ...result });
			})
			.catch(() => {
				if (cancelled) return;
				setState({
					phase: "ready",
					id: newDocumentId(),
					doc: blankDocument,
					view: DEFAULT_VIEW,
					storageAvailable: false,
					notice: null,
				});
			})
			.finally(() => clearTimeout(timer));
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, []);

	if (state.phase === "loading") {
		return slow ? <EditorSkeleton /> : null;
	}
	return (
		<EditorShell
			key={state.id}
			docId={state.id}
			initialDoc={state.doc}
			initialView={state.view}
			storageAvailable={state.storageAvailable}
			notice={state.notice}
		/>
	);
}
