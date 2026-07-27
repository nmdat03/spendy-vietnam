// Dexie database: the single source of truth for offline-first data.
// All UI reads happen through `liveQuery` so the UI reacts to IndexedDB changes.
import Dexie, { type Table } from 'dexie';
import type { Category, SettingRow, SyncQueueItem, Transaction } from './schema';
import { seedDefaultCategories, defaultSettings } from './seed';

export class SpendyDB extends Dexie {
	transactions!: Table<Transaction, number>;
	categories!: Table<Category, number>;
	settings!: Table<SettingRow, string>;
	syncQueue!: Table<SyncQueueItem, number>;

	constructor() {
		super('spendy-track');
		this.version(1).stores({
			transactions:
				'++id, type, categoryId, amount, currency, date, createdAt, updatedAt, syncStatus',
			categories: '++id, type, name, order',
			settings: 'key',
			syncQueue: '++id, entity, entityId, operation, createdAt'
		});
	}
}

export const db = new SpendyDB();

// Bootstraps the DB with default categories + settings the first time it opens.
let bootstrapped = false;
export async function ensureSeed(): Promise<void> {
	if (bootstrapped) return;
	bootstrapped = true;
	const categoryCount = await db.categories.count();
	if (categoryCount === 0) {
		await db.categories.bulkAdd(seedDefaultCategories());
	}
	const settingCount = await db.settings.count();
	if (settingCount === 0) {
		await db.settings.bulkAdd(defaultSettings());
	}
}

// ---- Transaction CRUD ----------------------------------------------------

export async function addTransaction(
	tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>
): Promise<number> {
	const now = new Date().toISOString();
	const id = await db.transactions.add({
		...tx,
		createdAt: now,
		updatedAt: now,
		syncStatus: 'pending'
	});
	await enqueueSync('transaction', id!, 'create', { ...tx, id });
	return id!;
}

export async function updateTransaction(id: number, patch: Partial<Transaction>): Promise<void> {
	const now = new Date().toISOString();
	await db.transactions.update(id, { ...patch, updatedAt: now, syncStatus: 'pending' });
	const full = await db.transactions.get(id);
	if (full) await enqueueSync('transaction', id, 'update', full);
}

export async function deleteTransaction(id: number): Promise<void> {
	await db.transactions.delete(id);
	await enqueueSync('transaction', id, 'delete', { id });
}

// ---- Category CRUD -------------------------------------------------------

export async function addCategory(cat: Omit<Category, 'id'>): Promise<number> {
	const id = await db.categories.add(cat);
	await enqueueSync('category', id!, 'create', { ...cat, id });
	return id!;
}

export async function updateCategory(id: number, patch: Partial<Category>): Promise<void> {
	await db.categories.update(id, patch);
	const full = await db.categories.get(id);
	if (full) await enqueueSync('category', id, 'update', full);
}

export async function deleteCategory(id: number, moveToCategoryId?: number): Promise<void> {
	if (moveToCategoryId && moveToCategoryId !== id) {
		const affected = await db.transactions.where('categoryId').equals(id).toArray();
		await db.transactions.bulkPut(
			affected.map((t) => ({ ...t, categoryId: moveToCategoryId, syncStatus: 'pending' as const }))
		);
		for (const t of affected)
			await enqueueSync('transaction', t.id!, 'update', { ...t, categoryId: moveToCategoryId });
	} else {
		// Mark orphaned transactions as Uncategorized (categoryId = 0)
		const affected = await db.transactions.where('categoryId').equals(id).toArray();
		await db.transactions.bulkPut(
			affected.map((t) => ({ ...t, categoryId: 0, syncStatus: 'pending' as const }))
		);
		for (const t of affected)
			await enqueueSync('transaction', t.id!, 'update', { ...t, categoryId: 0 });
	}
	await db.categories.delete(id);
	await enqueueSync('category', id, 'delete', { id });
}

// ---- Settings ------------------------------------------------------------

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
	const row = await db.settings.get(key);
	return (row?.value as T) ?? fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
	await db.settings.put({ key: key as never, value });
}

// ---- Sync queue helpers --------------------------------------------------

export async function enqueueSync(
	entity: 'transaction' | 'category',
	entityId: number,
	operation: 'create' | 'update' | 'delete',
	payload: unknown
): Promise<void> {
	await db.syncQueue.add({
		entity,
		entityId,
		operation,
		payload,
		createdAt: new Date().toISOString(),
		attempts: 0
	});
}

export async function clearSyncQueue(ids: number[]): Promise<void> {
	await db.syncQueue.bulkDelete(ids);
}
