// Миграции документа между версиями схемы (поле version, docs/document-model.md).
// Вызываются из validateDocument — значит, одинаково для «Открыть…» и для сессии из
// IndexedDB: старый документ открывается уже в текущей схеме, и ни редактор, ни
// render() о старых версиях не знают.
import type {
	CutlineDocument,
	CutlineElement,
	FontRef,
	FontWeight,
} from "./document";

export const CURRENT_VERSION = 4;

// До v4 вес шрифта был строкой. Документ старой версии (файл, IndexedDB, фикстура
// бейджа в v1) типизируется так, чтобы шаги миграции его принимали без приведений
type LegacyWeight = "regular" | "bold";
type AnyWeight<T> = T extends { weight: FontWeight }
	? Omit<T, "weight"> & { weight: FontWeight | LegacyWeight }
	: T;
export type AnyVersionDocument = Omit<CutlineDocument, "elements" | "fonts"> & {
	elements: AnyWeight<CutlineElement>[];
	fonts: AnyWeight<FontRef>[];
};

// Имя документа, которого не назвали: новый пустой лист, старые файлы до v3
export const UNTITLED = "Без названия";

// v1 → v2: «по базовой линии» раньше значило «y — базовая линия первой строки»: текст
// рисовался над y, а рамка y..y+h лежала под ним. Теперь базовая линия последней
// строки — на нижнем крае рамки (y + h). Сдвиг y −= h оставляет однострочный текст
// ровно на месте. Многострочный поднимется на (n−1)·lineHeight: число строк зависит
// от записи, мигратор его не знает.
function v1toV2(doc: AnyVersionDocument): AnyVersionDocument {
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

// v2 → v3: у документа появилось имя — для шапки и списка документов (Этап 5).
// Старый документ получает «Без названия»: угадывать имя по содержимому ненадёжно.
function v2toV3(doc: AnyVersionDocument): AnyVersionDocument {
	return { ...doc, version: 3, name: UNTITLED };
}

// v3 → v4: вес шрифта — число, как в CSS, чтобы завести Medium и SemiBold (500/600).
// Строковые «regular»/«bold» становятся 400/700; уже числовые не трогаем
function numericWeight(weight: FontWeight | LegacyWeight): FontWeight {
	return weight === "regular" ? 400 : weight === "bold" ? 700 : weight;
}

function v3toV4(doc: AnyVersionDocument): CutlineDocument {
	return {
		...doc,
		version: 4,
		fonts: doc.fonts.map((f) => ({ ...f, weight: numericWeight(f.weight) })),
		elements: doc.elements.map((el) =>
			el.type === "text" ? { ...el, weight: numericWeight(el.weight) } : el,
		),
	};
}

const STEPS: Record<
	number,
	(doc: AnyVersionDocument) => AnyVersionDocument | CutlineDocument
> = {
	1: v1toV2,
	2: v2toV3,
	3: v3toV4,
};

export function migrateDocument(doc: AnyVersionDocument): CutlineDocument {
	if (doc.version > CURRENT_VERSION) {
		throw new Error(
			`Документ сохранён более новой версией Cutline (схема v${doc.version}) — обновите страницу`,
		);
	}
	let current: AnyVersionDocument = doc;
	while (current.version < CURRENT_VERSION) {
		const step = STEPS[current.version];
		if (!step) {
			throw new Error(`Неизвестная версия документа: v${current.version}`);
		}
		current = step(current);
	}
	// последний шаг — v3toV4, после него веса числовые: документ в текущей схеме
	return current as CutlineDocument;
}
