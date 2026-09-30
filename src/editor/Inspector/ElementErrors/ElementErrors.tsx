// Почему у элемента на карточке пусто: ошибка в функции плейсхолдера или картинка,
// которая не загрузилась. Ошибки шаблона (нет такой функции, не закрыта скобка) — одни
// на все записи; ошибки значения и сломанные ссылки — по записям, как «не влезает».
import { imageSourceErrors, templateErrors } from "../../../data/placeholders";
import { plural } from "../../lib/plural";
import styles from "./ElementErrors.module.css";

export interface RecordError {
	// номер записи с 1
	n: number;
	message: string;
	// ошибка в условии показа — показывается под условием, а не под содержимым
	inCondition: boolean;
}

export interface ElementErrorsProps {
	template: string;
	kind: "text" | "image";
	recordErrors: RecordError[];
}

// дальше — «и ещё N»: список на двадцать записей инспектор не вместит
const LISTED = 3;

export function ElementErrors({
	template,
	kind,
	recordErrors,
}: ElementErrorsProps) {
	const fixed =
		kind === "text" ? templateErrors(template) : imageSourceErrors(template);
	if (!fixed.length && !recordErrors.length) return null;
	const rest = recordErrors.length - LISTED;
	return (
		<ul className={styles.list}>
			{fixed.map((message) => (
				<li key={message} className={styles.error}>
					{message}
				</li>
			))}
			{recordErrors.slice(0, LISTED).map((e) => (
				<li key={`${e.n}:${e.message}`} className={styles.recordError}>
					Запись {e.n}: {e.message}
				</li>
			))}
			{rest > 0 && (
				<li className={styles.more}>
					и ещё в {rest} {plural(rest, "записи", "записях", "записях")}
				</li>
			)}
		</ul>
	);
}
