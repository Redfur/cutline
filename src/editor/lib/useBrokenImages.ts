// Какие картинки документа не загружаются — для заглушек на холсте и в миниатюрах и
// для проблем записей. render() в сеть не ходит (он синхронный и чистый), поэтому
// проверяет редактор: <img> браузера, тот же, что потом нарисует <image> в SVG.
// Результат по ссылке живёт всю сессию: ссылки одни и те же у холста, сетки и после
// переключения документа, а проверять заново на каждую правку незачем.
import { useEffect, useMemo, useState } from "react";

type Status = "pending" | "ok" | "broken";

const statuses = new Map<string, Status>();

export function useBrokenImages(
	hrefs: ReadonlySet<string>,
): ReadonlySet<string> {
	// счётчик, а не сам набор в состоянии: ответы приходят по одному и в любом порядке
	const [version, setVersion] = useState(0);

	useEffect(() => {
		for (const href of hrefs) {
			if (statuses.has(href)) continue;
			statuses.set(href, "pending");
			const img = new Image();
			img.onload = () => statuses.set(href, "ok");
			img.onerror = () => {
				statuses.set(href, "broken");
				// после размонтирования setState — пустая операция, отписываться не нужно
				setVersion((v) => v + 1);
			};
			img.src = href;
		}
	}, [hrefs]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: version не читается, но значит «пришёл новый ответ» — statuses вне React
	return useMemo(
		() => new Set([...hrefs].filter((h) => statuses.get(h) === "broken")),
		[hrefs, version],
	);
}
