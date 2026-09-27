// Верхний уровень приложения: стартовый экран или открытый документ, и что с
// документами делают (переключить, создать из шаблона, открыть файл, дублировать,
// удалить). Какой экран и документ на экране, решает адрес (lib/routes.ts):
// #/new, #/doc/<id>, #/doc/<id>/data — работают «Назад» и ссылки. Сам документ
// правит EditorShell — у каждого документа свой редактор (key={id}) и своя
// история undo.
//
// Документ читается до монтирования EditorShell: смонтированный с пустым листом
// редактор успел бы записать его поверх того, что человек делал до перезагрузки.
import { useCallback, useEffect, useRef, useState } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import type { CutlineDocument } from "../../model/document";
import { blankDocument } from "../../render/fixtures/blank";
import {
	deleteDocument,
	lastOpenedId,
	listDocuments,
	loadDocument,
	newDocumentId,
	rememberOpened,
	saveDocument,
	type ViewState,
} from "../../storage/documents";
import { documentFromTemplate } from "../../templates/templates";
import { EditorShell } from "../EditorShell";
import { EditorSkeleton } from "../EditorSkeleton";
import { docPath, type EditorMode, NEW_PATH, parseRoute } from "../lib/routes";
import { ALL_BORDERS } from "../lib/snap";
import { StartScreen } from "../StartScreen";

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

function fresh(doc: CutlineDocument): Opened {
	return { id: newDocumentId(), doc, view: DEFAULT_VIEW, notice: null };
}

// Первый открывающийся: сначала preferred (последний открытый), потом свежие сверху;
// открыть нечего — null, стартовый экран
async function openFirstAvailable(
	preferred: string | null,
	exclude: string | null = null,
	// почему не открылся тот, что просили по адресу
	initialNotice: string | null = null,
): Promise<Opened | null> {
	const list = await listDocuments();
	const order = [
		...(preferred ? [preferred] : []),
		...list.map((d) => d.id).filter((id) => id !== preferred),
	].filter((id) => id !== exclude);
	let notice = initialNotice;
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
	return null;
}

export function Workspace() {
	const [path, navigate] = useHashLocation();
	const route = parseRoute(path);
	// null — ещё не знаем, открылся ли IndexedDB
	const [storageAvailable, setStorageAvailable] = useState<boolean | null>(
		null,
	);
	const lastRef = useRef<string | null>(null);
	// документ, который сейчас на экране (его id совпадает с адресом)
	const [opened, setOpened] = useState<Opened | null>(null);
	// Документы, которые уже есть в памяти: только что созданный и тот, с которого
	// ушли на стартовый экран. Их не перечитываем из IndexedDB — без хранилища их там
	// нет, а с ним последняя правка могла ещё не записаться
	const memory = useRef(new Map<string, Opened>());
	// с какого документа пришли на стартовый экран — к нему «Вернуться»
	const [back, setBack] = useState<Opened | null>(null);
	const [slow, setSlow] = useState(false);

	useEffect(() => {
		lastOpenedId()
			.then((last) => {
				lastRef.current = last;
				setStorageAvailable(true);
			})
			// хранилища нет — работаем в памяти, документ просто не сохранится
			.catch(() => setStorageAvailable(false));
	}, []);

	const routeId = route.kind === "doc" ? route.id : null;
	const openedId = opened?.id ?? null;
	const loading =
		storageAvailable === null ||
		route.kind === "root" ||
		(routeId !== null && openedId !== routeId);

	useEffect(() => {
		if (!loading) {
			setSlow(false);
			return;
		}
		const timer = setTimeout(() => setSlow(true), SKELETON_DELAY_MS);
		return () => clearTimeout(timer);
	}, [loading]);

	const show = useCallback(
		(next: Opened, mode: EditorMode, replace: boolean) => {
			memory.current.set(next.id, next);
			navigate(docPath(next.id, mode), { replace });
		},
		[navigate],
	);

	// Адрес → документ. Незнакомый или битый id не оставляет на пустом экране:
	// открывается первый доступный с пояснением, адрес подменяется (replace)
	useEffect(() => {
		if (storageAvailable === null) return;
		// Ушли с документа — забываем его снимок: opened.doc — версия на момент
		// открытия, и вернись адрес к тому же id (битый id, «#/»), редактор
		// смонтировался бы с ней, а автосохранение записало бы её поверх правок
		if (openedId !== null && openedId !== routeId) {
			setOpened(null);
			return;
		}
		let cancelled = false;
		const fallback = (exclude: string | null, notice: string | null) =>
			(storageAvailable
				? openFirstAvailable(lastRef.current, exclude, notice)
				: Promise.resolve(null)
			).then((first) => {
				if (cancelled) return;
				if (first) show(first, first.view.mode, true);
				else navigate(NEW_PATH, { replace: true });
			});

		if (route.kind === "root") {
			void fallback(null, null).catch(() => {
				if (!cancelled) navigate(NEW_PATH, { replace: true });
			});
		} else if (routeId !== null && openedId !== routeId) {
			const id = routeId;
			const inMemory = memory.current.get(id);
			const open = (next: Opened) => {
				memory.current.delete(id);
				lastRef.current = id;
				// не записался — после F5 откроется прежний документ, работать это не мешает
				if (storageAvailable) void rememberOpened(id).catch(() => {});
				setOpened(next);
			};
			if (inMemory) {
				open(inMemory);
			} else if (!storageAvailable) {
				void fallback(id, null);
			} else {
				loadDocument(id)
					.then((result) => {
						if (cancelled) return;
						if (result.status === "ok") {
							const { doc, view } = result.stored;
							open({ id, doc, view, notice: null });
							return;
						}
						return fallback(
							id,
							result.status === "invalid"
								? `Документ не открылся: ${result.reason}`
								: "Документ не найден — возможно, его удалили",
						);
					})
					.catch(() => {
						if (!cancelled) navigate(NEW_PATH, { replace: true });
					});
			}
		}
		return () => {
			cancelled = true;
		};
	}, [route.kind, routeId, openedId, storageAvailable, show, navigate]);

	// Новый документ записывается сразу, а не с первой правкой: он должен появиться в
	// списке, даже если в нём ничего не меняли (открытый файл, копия, шаблон)
	const create = useCallback(
		async (doc: CutlineDocument) => {
			const next = fresh(doc);
			if (storageAvailable) {
				await saveDocument({ ...next, savedAt: Date.now() }).catch(() => {
					// не записался — открываем всё равно, индикатор сохранения скажет о проблеме
				});
			}
			show(next, "design", false);
		},
		[storageAvailable, show],
	);

	const docId = opened?.id;
	const handleModeChange = useCallback(
		(mode: EditorMode) => {
			if (docId) navigate(docPath(docId, mode));
		},
		[docId, navigate],
	);

	const report = (error: unknown) => {
		alert(error instanceof Error ? error.message : String(error));
	};

	if (route.kind === "new" && storageAvailable !== null) {
		return (
			<StartScreen
				backName={back?.doc.name}
				onBack={back ? () => show(back, back.view.mode, false) : undefined}
				onPick={(template) =>
					void create(
						template ? documentFromTemplate(template) : blankDocument,
					).catch(report)
				}
			/>
		);
	}

	if (loading || !opened || route.kind !== "doc") {
		return slow ? <EditorSkeleton /> : null;
	}

	return (
		<EditorShell
			key={opened.id}
			docId={opened.id}
			initialDoc={opened.doc}
			initialView={opened.view}
			mode={route.mode}
			onModeChange={handleModeChange}
			storageAvailable={storageAvailable === true}
			notice={opened.notice}
			onSwitchDocument={(id) => navigate(docPath(id))}
			onNewDocument={(current) => {
				// документ берём из редактора, а не opened.doc: тот — снимок на момент
				// открытия, без правок; вернёмся — откроется таким, каким его оставили
				const left = { ...opened, ...current, notice: null };
				setBack(left);
				// и для «Назад» в браузере, а не только для кнопки «Вернуться»
				memory.current.set(left.id, left);
				setOpened(null);
				navigate(NEW_PATH);
			}}
			onOpenDocument={(doc) => void create(doc).catch(report)}
			onDuplicateDocument={(doc) =>
				void create({ ...doc, name: `${doc.name} — копия` }).catch(report)
			}
			onDeleteDocument={() => {
				// отложенные правки удаляемого редактора, дописанные при размонтировании,
				// хранилище отбросит (deleteDocument помнит удалённые id)
				const id = opened.id;
				setBack((b) => (b?.id === id ? null : b));
				deleteDocument(id)
					.then(() => openFirstAvailable(null, id))
					.then((next) => {
						if (next) show(next, next.view.mode, true);
						else navigate(NEW_PATH, { replace: true });
					})
					.catch(report);
			}}
		/>
	);
}
