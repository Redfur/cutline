// Счётчик загрузок шрифтов. Canvas measureText меряет тем шрифтом, что загружен
// сейчас: пока веб-шрифт документа не догрузился, текст меряется запасным (он уже),
// и длинное имя «влезает». Документ после загрузки не меняется, поэтому всё, что
// мемоизировано по документу (проблемы, миниатюры), без этого счётчика так и осталось
// бы посчитанным по запасному шрифту — реальный баг: сетка не обводила запись,
// которую холст уже рисовал обрезанной.
import { useEffect, useState } from "react";

export function useFontsVersion(): number {
	const [version, setVersion] = useState(0);
	useEffect(() => {
		const { fonts } = document;
		let alive = true;
		const bump = () => {
			if (alive) setVersion((v) => v + 1);
		};
		fonts.addEventListener("loadingdone", bump);
		// шрифты, догрузившиеся между первым рендером и подпиской, событие уже не дадут
		fonts.ready.then(bump);
		return () => {
			alive = false;
			fonts.removeEventListener("loadingdone", bump);
		};
	}, []);
	return version;
}
