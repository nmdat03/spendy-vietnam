// Rune-based settings state. Loaded from Dexie on app boot and kept in sync.
import { ensureSeed, getSetting, setSetting } from '$lib/db';
import type { SettingKey } from '$lib/db/schema';

interface SettingsState {
	defaultCurrency: string;
	theme: 'light' | 'dark';
	autoSyncEnabled: boolean;
	lastSyncedAt: string | null;
	userName: string;
	avatarSeed: string;
	startingBalanceCash: number;
	startingBalanceDebit: number;
	hasOnboarded: boolean;
	defaultAccount: 'cash' | 'debit';
}

const defaults: SettingsState = {
	defaultCurrency: 'IDR',
	theme: 'light',
	autoSyncEnabled: true,
	lastSyncedAt: null,
	userName: 'Friend',
	avatarSeed: 'spendy',
	startingBalanceCash: 0,
	startingBalanceDebit: 0,
	hasOnboarded: false,
	defaultAccount: 'cash'
};

function reflect(key: SettingKey, value: unknown): void {
	switch (key) {
		case 'defaultCurrency':
			state.defaultCurrency = value as string;
			break;
		case 'theme':
			state.theme = value as 'light' | 'dark';
			break;
		case 'autoSyncEnabled':
			state.autoSyncEnabled = value as boolean;
			break;
		case 'lastSyncedAt':
			state.lastSyncedAt = value as string | null;
			break;
		case 'userName':
			state.userName = value as string;
			break;
		case 'avatarSeed':
			state.avatarSeed = value as string;
			break;
		case 'startingBalanceCash':
			state.startingBalanceCash = value as number;
			break;
		case 'startingBalanceDebit':
			state.startingBalanceDebit = value as number;
			break;
		case 'hasOnboarded':
			state.hasOnboarded = value as boolean;
			break;
		case 'defaultAccount':
			state.defaultAccount = value as 'cash' | 'debit';
			break;
	}
}

let state = $state<SettingsState>({ ...defaults });
let loaded = false;

export const settings = {
	get value() {
		return state;
	},
	get loaded() {
		return loaded;
	},
	async load() {
		await ensureSeed();
		state = {
			defaultCurrency: (await getSetting('defaultCurrency', defaults.defaultCurrency)) as string,
			theme: (await getSetting('theme', defaults.theme)) as 'light' | 'dark',
			autoSyncEnabled: (await getSetting('autoSyncEnabled', defaults.autoSyncEnabled)) as boolean,
			lastSyncedAt: (await getSetting('lastSyncedAt', null)) as string | null,
			userName: (await getSetting('userName', defaults.userName)) as string,
			avatarSeed: (await getSetting('avatarSeed', defaults.avatarSeed)) as string,
			startingBalanceCash: (await getSetting('startingBalanceCash', defaults.startingBalanceCash)) as number,
			startingBalanceDebit: (await getSetting('startingBalanceDebit', defaults.startingBalanceDebit)) as number,
			hasOnboarded: (await getSetting('hasOnboarded', defaults.hasOnboarded)) as boolean,
			defaultAccount: (await getSetting('defaultAccount', defaults.defaultAccount)) as 'cash' | 'debit'
		};
		loaded = true;
	},
	async update<K extends SettingKey>(key: K, value: unknown) {
		await setSetting(key, value);
		// Reflect into rune state immediately (typed via setter switch).
		reflect(key, value);
	}
};