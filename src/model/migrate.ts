// Миграции документа между версиями схемы (поле version, docs/document-model.md).
// Вызываются из validateDocument — значит, одинаково для «Открыть…» и для сессии из
// IndexedDB: старый документ открывается уже в текущей схеме, и ни редактор, ни
// render() о старых версиях не знают.
import type { CutlineDocument } from "./document";

export const CURRENT_VERSION = 2;

// v1 → v2: «по базовой линии» раньше значило «y — базовая линия первой строки»: текст
// рисовался над y, а рамка y..y+h лежала под ним. Теперь базовая линия последней
// строки — на нижнем крае рамки (y + h). Сдвиг y −= h оставляет однострочный текст
// ровно на месте. Многострочный поднимется на (n−1)·lineHeight: число строк зависит
// от записи, мигратор его не знает.
function v1toV2(doc: CutlineDocument): CutlineDocument {
	return {
		...doc,
		version: 2,
		elements: doc.elements.map((el) =>
			el.type === "text" && el.valign === "baseline"
				? { ...el, y: el.y - el.h }
				: el,
		),
	};
}

const STEPS: Record<number, (doc: CutlineDocument) => CutlineDocument> = {
	1: v1toV2,
};

export function migrateDocument(doc: CutlineDocument): CutlineDocument {
	if (doc.version > CURRENT_VERSION) {
		throw new Error(
			`Документ сохранён более новой версией Cutline (схема v${doc.version}) — обновите страницу`,
		);
	}
	let current = doc;
	while (current.version < CURRENT_VERSION) {
		const step = STEPS[current.version];
		if (!step) {
			throw new Error(`Неизвестная версия документа: v${current.version}`);
		}
		current = step(current);
	}
	return current;
}
