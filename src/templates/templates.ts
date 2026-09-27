// Шаблоны стартового экрана — по editor/data.js проекта cutline (CL_DATA.templates).
// Макет хранит текст в своих единицах; здесь они переведены в модель документа один
// раз, при описании шаблона:
//   кегль и мин. кегль — pt → мм (как их показывает инспектор, lib/units.ts);
//   межстрочный — % → множитель; трекинг — % от кегля (letterSpacing: n/100 em) → мм;
//   вес — как есть (400–700; у PT Serif 500/600 наберутся Regular/Bold);
//   valign "bottom" → "baseline" (последняя строка на нижнем крае рамки);
//   порядок слоёв: в макете первый элемент — верхний, в модели первый рисуется первым.
import { pctToLineHeight, pctToTracking, ptToMm } from "../editor/lib/units";
import type {
	CutlineDocument,
	CutlineElement,
	DataRecord,
	FieldDef,
	FontWeight,
	TextElement,
} from "../model/document";
import { CURRENT_VERSION } from "../model/migrate";

export interface Template {
	id: string;
	name: string;
	// подпись под названием на стартовом экране
	note: string;
	doc: CutlineDocument;
}

interface TextSpec {
	id: string;
	name: string;
	x: number;
	y: number;
	w: number;
	h: number;
	content: string;
	font?: string;
	weight?: FontWeight;
	size: number; // pt
	lh?: number; // %
	tracking?: number; // % кегля
	align?: TextElement["align"];
	valign?: "top" | "middle" | "bottom";
	color: string;
	autofit: "none" | "shrink";
	minSize: number; // pt
}

function text(spec: TextSpec): TextElement {
	const size = ptToMm(spec.size);
	return {
		id: spec.id,
		name: spec.name,
		type: "text",
		x: spec.x,
		y: spec.y,
		w: spec.w,
		h: spec.h,
		rotation: 0,
		locked: false,
		visible: true,
		content: spec.content,
		font: spec.font ?? "Golos Text",
		weight: spec.weight ?? 400,
		size,
		minSize: ptToMm(spec.minSize),
		lineHeight: pctToLineHeight(spec.lh ?? 115),
		tracking: pctToTracking(spec.tracking ?? 0, size),
		align: spec.align ?? "left",
		valign: spec.valign === "bottom" ? "baseline" : (spec.valign ?? "top"),
		color: spec.color,
		fit: spec.autofit,
		transform: "none",
	};
}

const base = { rotation: 0, locked: false, visible: true };

function fieldsOf(columns: string[], records: DataRecord[]): FieldDef[] {
	// пример для пустого макета — из первой записи, как её видно на миниатюре шаблона
	return columns.map((key) => ({
		key,
		label: key,
		sample: records[0]?.[key] ?? "",
	}));
}

function recordsOf(columns: string[], rows: string[][]): DataRecord[] {
	return rows.map((row) =>
		Object.fromEntries(columns.map((c, i) => [c, row[i] ?? ""])),
	);
}

function doc(
	name: string,
	canvas: CutlineDocument["canvas"],
	columns: string[],
	rows: string[][],
	// сверху вниз, как в списке слоёв макета
	layersTopFirst: CutlineElement[],
): CutlineDocument {
	const records = recordsOf(columns, rows);
	return {
		version: CURRENT_VERSION,
		name,
		canvas,
		fonts: [],
		elements: [...layersTopFirst].reverse(),
		records,
		fields: fieldsOf(columns, records),
		guides: [],
	};
}

// Бейдж: текст по умолчанию в макете — autofit none, мин. 8 pt, цвет #1D3B34
const badgeText = (
	spec: Omit<TextSpec, "color" | "autofit" | "minSize"> & { color?: string },
) => text({ color: "#1D3B34", autofit: "none", minSize: 8, ...spec });

const badgeColumns = ["Имя", "Должность", "Отдел", "Дата"];
const badgeRows = [
	["Анна Соколова", "Руководитель проектов", "Проектный офис", "14 окт"],
	["Дмитрий Орлов", "Инженер-конструктор", "Конструкторское бюро", "14 окт"],
	["Мария Ким", "Арт-директор", "Маркетинг", "15 окт"],
	["Игорь Белов", "Директор по развитию", "Развитие бизнеса", "14 окт"],
	["Екатерина Лебедева", "Аналитик данных", "Аналитика", "15 окт"],
	["Тимур Хасанов", "Разработчик", "Цифровые продукты", "14 окт"],
	["Ольга Миронова", "Бухгалтер", "Финансы", "15 окт"],
	[
		"Александра Константинопольская-Рождественская",
		"Менеджер по работе с клиентами",
		"Продажи",
		"14 окт",
	],
	["Павел Громов", "Технолог", "Производство", "14 окт"],
	["Светлана Юсупова", "HR-партнёр", "Персонал", "15 окт"],
	["Роман Зайцев", "Специалист по закупкам", "Закупки", "14 окт"],
	["Алия Галиева", "Юрист", "Правовой отдел", "15 окт"],
	["Никита Воронин", "Инженер по качеству", "Производство", "14 окт"],
	["Елена Фролова", "Руководитель группы", "Поддержка", "15 окт"],
	["Артём Никитин", "Дизайнер", "Маркетинг", "14 окт"],
	["Ирина Сафина", "Экономист", "Финансы", "14 окт"],
	[
		"Максимилиан Мухаметшин-Преображенский",
		"Главный эксперт",
		"Развитие бизнеса",
		"15 окт",
	],
	["Ксения Павлова", "Координатор", "Проектный офис", "15 окт"],
	["Руслан Ахметов", "", "Логистика", "14 окт"],
	["Вера Степанова", "Инженер", "Конструкторское бюро", "15 окт"],
	["Глеб Смирнов", "Менеджер продукта", "Цифровые продукты", "14 окт"],
	["Диана Каримова", "Маркетолог", "Маркетинг", "15 окт"],
	["Олег Карпов", "Начальник смены", "Производство", "14 окт"],
	["Юлия Андреева", "Аналитик", "Аналитика", "15 окт"],
	["Семён Лукин", "Водитель-экспедитор", "Логистика", "14 окт"],
];

const badge: Template = {
	id: "badge",
	name: "Бейдж участника",
	note: "Конференции, форумы",
	doc: doc(
		"Бейдж участника",
		{ w: 105, h: 148, bleed: 3, safe: 5, background: "#FFFFFF" },
		badgeColumns,
		badgeRows,
		[
			badgeText({
				id: "cat",
				name: "Дата",
				x: 44,
				y: 128,
				w: 40,
				h: 9,
				content: "{{Дата}}",
				weight: 600,
				size: 9,
				align: "right",
				valign: "middle",
				tracking: 4,
			}),
			{
				...base,
				id: "dot",
				type: "ellipse",
				name: "Метка дня",
				x: 88,
				y: 128,
				w: 9,
				h: 9,
				fill: "#E8B04A",
				stroke: null,
				strokeWidth: 0,
			},
			// в макете — заглушка «qr.png»: картинку человек подставит сам
			{
				...base,
				id: "qr",
				type: "image",
				name: "QR-код",
				x: 8,
				y: 108,
				w: 30,
				h: 30,
				src: "",
				fit: "contain",
			},
			{
				...base,
				id: "rule",
				type: "line",
				name: "Разделитель",
				x: 8,
				y: 100,
				w: 89,
				h: 0,
				stroke: "#1D3B34",
				strokeWidth: 0.3,
			},
			badgeText({
				id: "role",
				name: "Должность",
				x: 8,
				y: 87,
				w: 89,
				h: 7,
				content: "{{Должность}}",
				size: 9,
				color: "#5B6660",
			}),
			badgeText({
				id: "company",
				name: "Отдел",
				x: 8,
				y: 79,
				w: 89,
				h: 7,
				content: "{{Отдел}}",
				size: 11,
				weight: 500,
			}),
			badgeText({
				id: "name",
				name: "Имя",
				x: 8,
				y: 48,
				w: 89,
				h: 24,
				content: "{{Имя}}",
				size: 24,
				weight: 700,
				lh: 105,
			}),
			badgeText({
				id: "date",
				name: "Дата и место",
				x: 8,
				y: 23,
				w: 89,
				h: 6,
				content: "14–15 октября · Казань",
				size: 8,
				color: "#FFFFFF",
			}),
			badgeText({
				id: "title",
				name: "Название события",
				x: 8,
				y: 10,
				w: 89,
				h: 10,
				content: "ТОЧКА РОСТА 2026",
				size: 14,
				weight: 700,
				color: "#FFFFFF",
				tracking: 2,
			}),
			{
				...base,
				id: "band",
				type: "rect",
				name: "Полоса",
				x: -3,
				y: -3,
				w: 111,
				h: 40,
				fill: "#1D3B34",
				stroke: null,
				strokeWidth: 0,
				radius: 0,
				locked: true,
			},
		],
	),
};

// Остальные шаблоны: текст по умолчанию — shrink, мин. 6 pt, цвет #1B1D20
const t = (
	spec: Omit<TextSpec, "color" | "autofit" | "minSize"> & { color?: string },
) => text({ color: "#1B1D20", autofit: "shrink", minSize: 6, ...spec });

const guest: Template = {
	id: "guest",
	name: "Карточка гостя",
	note: "Рассадка на банкете",
	doc: doc(
		"Карточка гостя",
		{ w: 100, h: 70, bleed: 3, safe: 5, background: "#FBF8F2" },
		["Имя", "Стол"],
		[
			["Анна Соколова", "3"],
			["Дмитрий Орлов", "3"],
			["Мария Ким", "5"],
		],
		[
			t({
				id: "g-table",
				name: "Стол",
				x: 10,
				y: 50,
				w: 80,
				h: 6,
				content: "Стол {{Стол}}",
				size: 9,
				align: "center",
				tracking: 3,
				color: "#8A6A3B",
			}),
			{
				...base,
				id: "g-rule",
				type: "line",
				name: "Разделитель",
				x: 40,
				y: 45,
				w: 20,
				h: 0,
				stroke: "#8A6A3B",
				strokeWidth: 0.3,
			},
			t({
				id: "g-name",
				name: "Имя",
				x: 10,
				y: 22,
				w: 80,
				h: 18,
				content: "{{Имя}}",
				font: "PT Serif",
				size: 20,
				lh: 110,
				align: "center",
				valign: "middle",
				color: "#2B2620",
			}),
		],
	),
};

const price: Template = {
	id: "price",
	name: "Ценник",
	note: "Магазин, ярмарка",
	doc: doc(
		"Ценник",
		{ w: 58, h: 40, bleed: 2, safe: 3, background: "#FFFFFF" },
		["Товар", "Цена", "Единица"],
		[
			["Мёд гречишный", "640", "500 г"],
			["Сыр козий", "1 200", "кг"],
			["Хлеб ржаной", "95", "шт."],
		],
		[
			t({
				id: "p-unit",
				name: "Единица",
				x: 4,
				y: 33,
				w: 50,
				h: 4,
				content: "за {{Единица}}",
				size: 7,
				color: "#5C6168",
			}),
			t({
				id: "p-price",
				name: "Цена",
				x: 4,
				y: 18,
				w: 50,
				h: 14,
				content: "{{Цена}} ₽",
				font: "Manrope",
				size: 26,
				weight: 700,
				lh: 100,
				valign: "bottom",
			}),
			t({
				id: "p-name",
				name: "Товар",
				x: 4,
				y: 3,
				w: 50,
				h: 10,
				content: "{{Товар}}",
				size: 9,
				weight: 600,
				color: "#FFFFFF",
				lh: 110,
				valign: "middle",
			}),
			{
				...base,
				id: "p-band",
				type: "rect",
				name: "Полоса",
				x: -2,
				y: -2,
				w: 62,
				h: 17,
				fill: "#C2412D",
				stroke: null,
				strokeWidth: 0,
				radius: 0,
				locked: true,
			},
		],
	),
};

const card: Template = {
	id: "card",
	name: "Визитка",
	note: "Сотрудники, команда",
	doc: doc(
		"Визитка",
		{ w: 90, h: 50, bleed: 3, safe: 4, background: "#FFFFFF" },
		["Имя", "Должность", "Телефон", "Email"],
		[
			[
				"Анна Соколова",
				"Руководитель проектов",
				"+7 912 000-12-34",
				"anna@tochka.ru",
			],
			[
				"Дмитрий Орлов",
				"Инженер-конструктор",
				"+7 912 000-56-78",
				"orlov@tochka.ru",
			],
		],
		[
			t({
				id: "c-mail",
				name: "Email",
				x: 6,
				y: 41,
				w: 78,
				h: 4,
				content: "{{Email}}",
				size: 7,
				color: "#5C6168",
			}),
			t({
				id: "c-phone",
				name: "Телефон",
				x: 6,
				y: 36,
				w: 78,
				h: 4,
				content: "{{Телефон}}",
				size: 7,
				color: "#5C6168",
			}),
			t({
				id: "c-role",
				name: "Должность",
				x: 6,
				y: 17,
				w: 78,
				h: 5,
				content: "{{Должность}}",
				size: 8,
				color: "#2F62E8",
			}),
			t({
				id: "c-name",
				name: "Имя",
				x: 6,
				y: 8,
				w: 78,
				h: 8,
				content: "{{Имя}}",
				font: "Manrope",
				size: 14,
				weight: 700,
			}),
		],
	),
};

export const TEMPLATES: Template[] = [badge, guest, price, card];

// Новый документ из шаблона: свои id элементов, чтобы два документа из одного шаблона
// не делили идентификаторы (копирование между ними, будущие ссылки на элементы)
export function documentFromTemplate(template: Template): CutlineDocument {
	return {
		...structuredClone(template.doc),
		elements: template.doc.elements.map((el) => ({
			...structuredClone(el),
			id: crypto.randomUUID(),
		})),
	};
}
