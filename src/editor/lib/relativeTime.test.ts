import { describe, expect, it } from "vitest";
import { relativeTime } from "./relativeTime";

// локальное время: «вчера» и «сегодня» считаются по календарю пользователя
const now = new Date(2026, 8, 27, 15, 0).getTime();
const at = (month: number, day: number, hour = 12, minute = 0, year = 2026) =>
	new Date(year, month, day, hour, minute).getTime();

describe("relativeTime", () => {
	it("только что и минуты", () => {
		expect(relativeTime(now - 20_000, now)).toBe("только что");
		expect(relativeTime(at(8, 27, 14, 55), now)).toBe("5 мин назад");
	});

	it("часы — пока тот же день", () => {
		expect(relativeTime(at(8, 27, 13, 0), now)).toBe("2 ч назад");
		expect(relativeTime(at(8, 27, 0, 30), now)).toBe("14 ч назад");
	});

	it("вчера — по календарю, даже если прошло меньше суток", () => {
		expect(relativeTime(at(8, 26, 23, 0), now)).toBe("вчера");
		expect(relativeTime(at(8, 26, 1, 0), now)).toBe("вчера");
	});

	it("раньше — дата с месяцем в родительном падеже", () => {
		expect(relativeTime(at(8, 22), now)).toBe("22 сент.");
		expect(relativeTime(at(6, 30), now)).toBe("30 июля");
		expect(relativeTime(at(4, 9), now)).toBe("9 мая");
	});

	it("прошлый год — с годом", () => {
		expect(relativeTime(at(11, 31, 12, 0, 2025), now)).toBe("31 дек. 2025");
	});
});
