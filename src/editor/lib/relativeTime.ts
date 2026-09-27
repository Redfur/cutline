// «изменён …» в списке документов: как в макете переключателя — «только что»,
// «5 мин назад», «2 ч назад», «вчера», «22 сент.». Месяцы — в родительном падеже, как
// пишут даты по-русски («30 июля»), а не как сокращает Intl («30 июл.»).
const MONTHS = [
	"янв.",
	"февр.",
	"марта",
	"апр.",
	"мая",
	"июня",
	"июля",
	"авг.",
	"сент.",
	"окт.",
	"нояб.",
	"дек.",
];

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function startOfDay(time: number): number {
	const d = new Date(time);
	return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function relativeTime(time: number, now: number): string {
	const diff = now - time;
	if (diff < MINUTE) return "только что";
	if (diff < HOUR) return `${Math.floor(diff / MINUTE)} мин назад`;
	const today = startOfDay(now);
	if (time >= today) return `${Math.floor(diff / HOUR)} ч назад`;
	// «вчера» по календарю, а не «24 часа назад»: вчерашний вечер — вчера и в 9 утра
	if (time >= startOfDay(today - 1)) return "вчера";
	const date = new Date(time);
	const year =
		date.getFullYear() === new Date(now).getFullYear()
			? ""
			: ` ${date.getFullYear()}`;
	return `${date.getDate()} ${MONTHS[date.getMonth()]}${year}`;
}
