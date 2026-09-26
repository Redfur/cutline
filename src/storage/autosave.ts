// Планировщик автосохранения: дебаунс, очередь записей и статус для индикатора.
// Без React и без IndexedDB — save приходит аргументом, поэтому логику «когда и
// что писать» можно проверить тестом на фейковых таймерах.

export type SaveStatus = "saved" | "saving" | "error";

export interface AutosaverOptions<T> {
	save: (snapshot: T) => Promise<void>;
	delayMs: number;
	onStatus: (status: SaveStatus, error?: unknown) => void;
}

export interface Autosaver<T> {
	// запомнить последний снимок и записать его, когда правки затихнут
	schedule: (snapshot: T) => void;
	// записать отложенный снимок немедленно (вкладку прячут или закрывают)
	flush: () => Promise<void>;
	dispose: () => void;
}

export function createAutosaver<T>({
	save,
	delayMs,
	onStatus,
}: AutosaverOptions<T>): Autosaver<T> {
	let pending: { snapshot: T } | null = null;
	let timer: ReturnType<typeof setTimeout> | null = null;
	// Записи идут строго по очереди: IndexedDB не обещает, что две параллельные
	// транзакции завершатся в порядке запуска, и более старый снимок мог бы лечь
	// поверх нового.
	let queue: Promise<void> = Promise.resolve();

	const flush = (): Promise<void> => {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
		if (!pending) return queue;
		const { snapshot } = pending;
		pending = null;
		queue = queue.then(async () => {
			try {
				await save(snapshot);
				// пока писали, могли прийти новые правки — тогда «Сохранено» было бы враньём
				if (!pending) onStatus("saved");
			} catch (error) {
				onStatus("error", error);
			}
		});
		return queue;
	};

	return {
		schedule(snapshot) {
			pending = { snapshot };
			onStatus("saving");
			if (timer !== null) clearTimeout(timer);
			timer = setTimeout(() => void flush(), delayMs);
		},
		flush,
		dispose() {
			if (timer !== null) clearTimeout(timer);
			timer = null;
		},
	};
}
