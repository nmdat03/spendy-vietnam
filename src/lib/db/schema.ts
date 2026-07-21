// Type definitions for the spending tracker data model.

export type TxType = 'income' | 'expense';
export type Account = 'cash' | 'debit';
export type SyncStatus = 'pending' | 'synced';

export interface Transaction {
	id?: number;
	type: TxType;
	account: Account; // cash or debit/card
	categoryId: number;
	amount: number; // always positive; sign derived from type
	currency: string;
	note: string;
	date: string; // ISO datetime
	createdAt: string;
	updatedAt: string;
	syncStatus: SyncStatus;
}

export interface Category {
	id?: number;
	type: TxType;
	name: string;
	icon: string; // lucide icon name
	color: string; // hex color
	order: number;
}

export type SettingKey =
	| 'defaultCurrency'
	| 'theme'
	| 'autoSyncEnabled'
	| 'lastSyncedAt'
	| 'userName'
	| 'avatarSeed'
	| 'startingBalanceCash'
	| 'startingBalanceDebit'
	| 'hasOnboarded'
	| 'defaultAccount';

export interface SettingRow {
	key: SettingKey;
	value: unknown;
}

export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncQueueItem {
	id?: number;
	entity: 'transaction' | 'category';
	entityId: number;
	operation: SyncOperation;
	payload: unknown;
	createdAt: string;
	attempts: number;
}