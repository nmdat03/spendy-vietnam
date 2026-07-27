import type { Category, SettingRow } from './schema';

// Default categories shipped on first run. Icons are lucide-svelte names.
export function seedDefaultCategories(): Omit<Category, 'id'>[] {
	return [
		// Expense
		{ type: 'expense', name: 'Makanan', icon: 'utensils', color: '#f97316', order: 0 },
		{ type: 'expense', name: 'Transportasi', icon: 'car', color: '#3b82f6', order: 1 },
		{ type: 'expense', name: 'Belanja', icon: 'shopping-bag', color: '#ec4899', order: 2 },
		{ type: 'expense', name: 'Hiburan', icon: 'film', color: '#8b5cf6', order: 3 },
		{ type: 'expense', name: 'Tagihan', icon: 'receipt', color: '#ef4444', order: 4 },
		{ type: 'expense', name: 'Kesehatan', icon: 'heart-pulse', color: '#14b8a6', order: 5 },
		{ type: 'expense', name: 'Lainnya', icon: 'circle-ellipsis', color: '#64748b', order: 6 },
		// Income
		{ type: 'income', name: 'Gaji', icon: 'wallet', color: '#22c55e', order: 0 },
		{ type: 'income', name: 'Bonus', icon: 'gift', color: '#10b981', order: 1 },
		{ type: 'income', name: 'Investasi', icon: 'trending-up', color: '#0ea5e9', order: 2 },
		{ type: 'income', name: 'Lainnya', icon: 'circle-ellipsis', color: '#64748b', order: 3 }
	];
}

export function defaultSettings(): SettingRow[] {
	return [
		{ key: 'defaultCurrency', value: 'IDR' },
		{ key: 'theme', value: 'auto' },
		{ key: 'autoSyncEnabled', value: true },
		{ key: 'lastSyncedAt', value: null },
		{ key: 'userName', value: 'Friend' },
		{ key: 'avatarSeed', value: 'spendy' },
		{ key: 'startingBalanceCash', value: 0 },
		{ key: 'startingBalanceDebit', value: 0 },
		{ key: 'hasOnboarded', value: false },
		{ key: 'defaultAccount', value: 'cash' },
		{ key: 'reduceMotion', value: false }
	];
}
