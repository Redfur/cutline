// Читает сохранённую сессию и только потом монтирует редактор. Монтировать
// EditorShell сразу с пустым документом нельзя: автосохранение успело бы записать
// пустой лист поверх того, что человек делал до перезагрузки.
import { useEffect, useState } from "react";
import type { CutlineDocument } from "../../model/document";
import { blankDocument } from "../../render/fixtures/blank";
import { loadSession, type ViewState } from "../../storage/session";
import { EditorShell } from "../EditorShell";
import { EditorSkeleton } from "../EditorSkeleton";

// IndexedDB обычно отвечает за 10–50 мс: скелетон, мелькнувший на один кадр,
// выглядит хуже короткой пустоты, поэтому показываем его только если ждём дольше
const SKELETON_DELAY_MS = 150;

const DEFAULT_VIEW: ViewState = { mode: "design", recordIndex: 0 };

type LoaderState =
	| { phase: "loading" }
	| {
			phase: "ready";
			doc: CutlineDocument;
			view: ViewState;
			storageAvailable: boolean;
			// почему открылся пустой лист вместо сохранённого — показывается в индикаторе
			notice: string | null;
	  };

export function DocumentLoader() {
	const [state, setState] = useState<LoaderState>({ phase: "loading" });
	const [slow, setSlow] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const timer = setTimeout(() => setSlow(true), SKELETON_DELAY_MS);
		loadSession()
			.then((result) => {
				if (cancelled) return;
				if (result.status === "ok") {
					setState({
						phase: "ready",
						doc: result.session.doc,
						view: result.session.view,
						storageAvailable: true,
						notice: null,
					});
				} else {
					setState({
						phase: "ready",
						doc: blankDocument,
						view: DEFAULT_VIEW,
						storageAvailable: true,
						notice:
							result.status === "invalid"
								? `Сохранённый документ не открылся: ${result.reason}`
								: null,
					});
				}
			})
			.catch(() => {
				if (cancelled) return;
				setState({
					phase: "ready",
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
			initialDoc={state.doc}
			initialView={state.view}
			storageAvailable={state.storageAvailable}
			notice={state.notice}
		/>
	);
}
