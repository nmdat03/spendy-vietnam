// Active month navigator state shared across the dashboard + money pages.

export interface MonthRef {
	year: number;
	month: number; // 0-11
}

function current(): MonthRef {
	const d = new Date();
	return { year: d.getFullYear(), month: d.getMonth() };
}

let active = $state<MonthRef>(current());

function shift(delta: number): MonthRef {
	const d = new Date(active.year, active.month + delta, 1);
	return { year: d.getFullYear(), month: d.getMonth() };
}

export const activeMonth = {
	get value() {
		return active;
	},
	set(ref: MonthRef) {
		active = ref;
	},
	prev() {
		active = shift(-1);
	},
	next() {
		active = shift(1);
	},
	isCurrent(): boolean {
		const c = current();
		return active.year === c.year && active.month === c.month;
	}
};

export function monthLabel(ref: MonthRef): string {
	return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
		new Date(ref.year, ref.month, 1)
	);
}

export function monthBounds(ref: MonthRef): { start: Date; end: Date } {
	const start = new Date(ref.year, ref.month, 1, 0, 0, 0, 0);
	const end = new Date(ref.year, ref.month + 1, 0, 23, 59, 59, 999);
	return { start, end };
}