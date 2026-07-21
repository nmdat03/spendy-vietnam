// useMonthData: bridges Dexie `liveQuery` with Svelte 5 runes.
// Re-subscribes whenever the active month changes; stays in sync with IndexedDB
// so the dashboard / charts / lists update automatically on every write.
import { liveQuery } from 'dexie';
import { db } from '$lib/db';
import type { Category, Transaction } from '$lib/db/schema';
import { settings } from './settings.svelte';
import { activeMonth, monthBounds } from './month.svelte';

export interface MonthData {
	transactions: Transaction[];
	categories: Category[];
	loading: boolean;
	monthIn: number;
	monthSpent: number;
	balance: number;
	balanceCash: number;
	balanceDebit: number;
	catsById: Map<number, Category>;
	byCategoryIncome: { cat: Category | undefined; amount: number }[];
	byCategoryExpense: { cat: Category | undefined; amount: number }[];
	allTransactions: Transaction[];
}

export function createMonthData(): MonthData {
	let transactions = $state<Transaction[]>([]);
	let categories = $state<Category[]>([]);
	let loading = $state(true);

	// Subscribe to categories (once).
	$effect(() => {
		const sub = liveQuery(() => db.categories.toArray()).subscribe({
			next: (c) => (categories = c),
			error: (e) => console.error('categories liveQuery', e)
		});
		return () => sub.unsubscribe();
	});

	// Subscribe to transactions for the active month; re-subscribe on month change.
	$effect(() => {
		const ref = activeMonth.value; // track
		const { start, end } = monthBounds(ref);
		const sub = liveQuery(() =>
			db.transactions
				.where('date')
				.between(start.toISOString(), end.toISOString(), true, true)
				.toArray()
		).subscribe({
			next: (t) => {
				transactions = t;
				loading = false;
			},
			error: (e) => console.error('transactions liveQuery', e)
		});
		return () => sub.unsubscribe();
	});

	// All-time balance for the headline (independent of month filter).
	let allTxs = $state<Transaction[]>([]);
	$effect(() => {
		const sub = liveQuery(() => db.transactions.toArray()).subscribe({
			next: (t) => (allTxs = t)
		});
		return () => sub.unsubscribe();
	});

	const catsById = $derived(new Map(categories.map((c) => [c.id!, c])));
	const monthIn = $derived(
		transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
	);
	const monthSpent = $derived(
		transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
	);
	// Net per-account movement from transactions (income - expense).
	const netCash = $derived(
		allTxs
			.filter((t) => (t.account ?? 'cash') === 'cash')
			.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)
	);
	const netDebit = $derived(
		allTxs
			.filter((t) => (t.account ?? 'cash') === 'debit')
			.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)
	);
	const balanceCash = $derived(settings.value.startingBalanceCash + netCash);
	const balanceDebit = $derived(settings.value.startingBalanceDebit + netDebit);
	const balance = $derived(balanceCash + balanceDebit);

	const byCategoryIncome = $derived(
		groupByCategory(transactions.filter((t) => t.type === 'income'), catsById)
	);
	const byCategoryExpense = $derived(
		groupByCategory(transactions.filter((t) => t.type === 'expense'), catsById)
	);

	return {
		get transactions() {
			return transactions;
		},
		get categories() {
			return categories;
		},
		get loading() {
			return loading;
		},
		get monthIn() {
			return monthIn;
		},
		get monthSpent() {
			return monthSpent;
		},
		get balance() {
			return balance;
		},
		get balanceCash() {
			return balanceCash;
		},
		get balanceDebit() {
			return balanceDebit;
		},
		get catsById() {
			return catsById;
		},
		get byCategoryIncome() {
			return byCategoryIncome;
		},
		get byCategoryExpense() {
			return byCategoryExpense;
		},
		get allTransactions() {
			return allTxs;
		}
	};
}

function groupByCategory(
	txs: Transaction[],
	cats: Map<number, Category>
): { cat: Category | undefined; amount: number }[] {
	const map = new Map<number, number>();
	for (const t of txs) {
		map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
	}
	return [...map.entries()]
		.map(([id, amount]) => ({ cat: cats.get(id), amount }))
		.sort((a, b) => b.amount - a.amount);
}