import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosaver, type SaveStatus } from "./autosave";

function setup(save = vi.fn(async (_s: number) => {})) {
	const statuses: SaveStatus[] = [];
	const saver = createAutosaver<number>({
		save,
		delayMs: 500,
		onStatus: (s) => statuses.push(s),
	});
	return { save, statuses, saver };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createAutosaver", () => {
	it("серия правок — одна запись последнего снимка после паузы", async () => {
		const { save, statuses, saver } = setup();
		saver.schedule(1);
		await vi.advanceTimersByTimeAsync(300);
		saver.schedule(2);
		await vi.advanceTimersByTimeAsync(300);
		saver.schedule(3);
		expect(save).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(500);
		expect(save).toHaveBeenCalledTimes(1);
		expect(save).toHaveBeenCalledWith(3);
		expect(statuses.at(-1)).toBe("saved");
	});

	it("flush пишет сразу, не дожидаясь паузы, и снимает таймер", async () => {
		const { save, saver } = setup();
		saver.schedule(7);
		await saver.flush();
		expect(save).toHaveBeenCalledWith(7);
		await vi.advanceTimersByTimeAsync(1000);
		expect(save).toHaveBeenCalledTimes(1);
	});

	it("flush без отложенного — ничего не пишет", async () => {
		const { save, saver } = setup();
		await saver.flush();
		expect(save).not.toHaveBeenCalled();
	});

	it("ошибка записи → error, следующая удачная → saved", async () => {
		const save = vi
			.fn(async (_s: number) => {})
			.mockRejectedValueOnce(new Error("QuotaExceededError"));
		const { statuses, saver } = setup(save);
		saver.schedule(1);
		await saver.flush();
		expect(statuses.at(-1)).toBe("error");
		saver.schedule(2);
		await saver.flush();
		expect(statuses.at(-1)).toBe("saved");
	});

	it("правка во время записи — не «Сохранено», а снова «Сохранение…»", async () => {
		let release: () => void = () => {};
		const save = vi.fn(
			(_s: number) =>
				new Promise<void>((resolve) => {
					release = resolve;
				}),
		);
		const { statuses, saver } = setup(save);
		saver.schedule(1);
		const writing = saver.flush();
		// дать очереди дойти до вызова save — иначе release ещё не подменён
		await vi.advanceTimersByTimeAsync(0);
		saver.schedule(2);
		release();
		await writing;
		expect(statuses.at(-1)).toBe("saving");
	});

	it("записи не перегоняют друг друга", async () => {
		const order: number[] = [];
		const save = vi.fn(async (s: number) => {
			// первая запись медленнее второй — без очереди вторая легла бы раньше
			await new Promise((r) => setTimeout(r, s === 1 ? 100 : 10));
			order.push(s);
		});
		const { saver } = setup(save);
		saver.schedule(1);
		void saver.flush();
		saver.schedule(2);
		const done = saver.flush();
		await vi.advanceTimersByTimeAsync(200);
		await done;
		expect(order).toEqual([1, 2]);
	});
});
