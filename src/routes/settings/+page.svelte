<script lang="ts">
	// Akun / Pengaturan: profile, category CRUD, currency, sync & backup, theme.
	import { onMount } from 'svelte';
	import { gsap, EASES } from '$lib/animations/gsap';
	import { motionReduced } from '$lib/state/settings.svelte';
	import { liveQuery } from 'dexie';
	import { db, addCategory, updateCategory, deleteCategory } from '$lib/db';
	import { settings } from '$lib/state/settings.svelte';
	import { createMonthData } from '$lib/state/monthData.svelte';
	import { SUPPORTED_CURRENCIES, formatCurrency } from '$lib/format/currency';
	import type { Category, TxType } from '$lib/db/schema';
	import Icon, { ICON_NAMES } from '$lib/components/Icon.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';

	// Reactive data hook so the profile shows the live total balance.
	const data = createMonthData();

	let categories = $state<Category[]>([]);
	$effect(() => {
		const sub = liveQuery(() => db.categories.toArray()).subscribe({
			next: (c) => (categories = c)
		});
		return () => sub.unsubscribe();
	});

	const incomeCats = $derived(
		categories.filter((c) => c.type === 'income').sort((a, b) => a.order - b.order)
	);
	const expenseCats = $derived(
		categories.filter((c) => c.type === 'expense').sort((a, b) => a.order - b.order)
	);

	let catTab = $state<TxType>('expense');
	const palette = [
		'#f97316',
		'#3b82f6',
		'#ec4899',
		'#8b5cf6',
		'#ef4444',
		'#14b8a6',
		'#22c55e',
		'#0ea5e9',
		'#f59e0b',
		'#64748b',
		'#a855f7',
		'#06b6d4'
	];

	// Editor state.
	let editing = $state<Category | null>(null);
	let newName = $state('');
	let newIcon = $state(ICON_NAMES[0]);
	let newColor = $state(palette[0]);
	let confirmDelete = $state<Category | null>(null);
	let moveToId = $state<number | null>(null);

	function openNew() {
		editing = {
			id: undefined,
			type: catTab,
			name: '',
			icon: ICON_NAMES[0],
			color: palette[0],
			order: (catTab === 'expense' ? expenseCats : incomeCats).length
		};
		newName = '';
		newIcon = ICON_NAMES[0];
		newColor = palette[0];
	}
	function openEdit(c: Category) {
		editing = { ...c };
		newName = c.name;
		newIcon = c.icon;
		newColor = c.color;
	}
	function closeEditor() {
		editing = null;
	}
	async function saveCat() {
		if (!editing || !newName.trim()) return;
		const payload = { name: newName.trim(), icon: newIcon, color: newColor };
		if (editing.id) {
			await updateCategory(editing.id, payload);
		} else {
			await addCategory({ type: editing.type, ...payload, order: editing.order });
		}
		editing = null;
	}
	async function confirmDeleteCat() {
		if (!confirmDelete) return;
		await deleteCategory(confirmDelete.id!, moveToId ?? undefined);
		confirmDelete = null;
		moveToId = null;
	}

	// Currency selector.
	const currency = $derived(settings.value.defaultCurrency);
	async function setCurrency(c: string) {
		await settings.update('defaultCurrency', c);
	}

	// Starting balance inputs (Cash / Debit).
	async function setSaldo(key: 'startingBalanceCash' | 'startingBalanceDebit', raw: string) {
		const n = Math.max(0, Number.parseFloat(raw || '0')) || 0;
		await settings.update(key, n);
	}

	// Theme toggle.
	async function setTheme(t: 'light' | 'dark' | 'auto') {
		await settings.update('theme', t);
	}

	// Reduce animation toggle.
	async function toggleReduceMotion() {
		await settings.update('reduceMotion', !settings.value.reduceMotion);
	}

	// Default account (cash/debit) for new transactions.
	async function setDefaultAccount(a: 'cash' | 'debit') {
		await settings.update('defaultAccount', a);
	}

	// Hidden "Reset onboarding" for testing/demo. Clears the flag then jumps to
	// /onboarding (the root layout guard will keep the user there until finished).
	async function resetOnboarding() {
		await settings.update('hasOnboarded', false);
		if (typeof location !== 'undefined') location.href = '/onboarding';
	}

	// Export / import.
	function exportData() {
		(async () => {
			const dump = {
				transactions: await db.transactions.toArray(),
				categories: await db.categories.toArray(),
				settings: await db.settings.toArray(),
				exportedAt: new Date().toISOString()
			};
			const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `spendy-track-${Date.now()}.json`;
			a.click();
			URL.revokeObjectURL(url);
		})();
	}
	async function importData(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		const text = await file.text();
		const dump = JSON.parse(text);
		if (dump.categories) await db.categories.bulkPut(dump.categories);
		if (dump.transactions) await db.transactions.bulkPut(dump.transactions);
		if (dump.settings) await db.settings.bulkPut(dump.settings);
		await settings.load();
	}

	let root = $state<HTMLElement | null>(null);
	onMount(() => {
		if (root && !motionReduced()) {
			gsap.from(root.querySelectorAll('.reveal'), {
				y: 14,
				opacity: 0,
				duration: 0.45,
				ease: EASES.out,
				stagger: 0.05
			});
		}
	});
</script>

<div class="settings" bind:this={root}>
	<header class="head reveal">
		<h1>Akun</h1>
	</header>

	<section class="card profile reveal">
		<div class="avatar" style="background: linear-gradient(135deg, #93c5fd, #c4b5fd)">
			{settings.value.userName.charAt(0).toUpperCase()}
		</div>
		<div class="profile-meta">
			<input
				class="name-input"
				type="text"
				value={settings.value.userName}
				oninput={(e) => settings.update('userName', e.currentTarget.value)}
			/>
			<span class="sub">{currency} · {formatCurrency(data.balance, currency)}</span>
		</div>
	</section>

	<section class="card reveal block">
		<h2 class="block-title">Kategori</h2>
		<div class="block-head">
			<SegmentedControl
				options={[
					{ value: 'expense', label: 'Pengeluaran' },
					{ value: 'income', label: 'Pemasukan' }
				]}
				value={catTab}
				onchange={(v) => (catTab = v as TxType)}
				size="sm"
			/>
			<button class="add-btn" onclick={openNew} aria-label="Tambah kategori">
				<Icon name="plus" size={16} /> Baru
			</button>
		</div>
		<ul class="cat-list">
			{#each catTab === 'expense' ? expenseCats : incomeCats as c (c.id)}
				<li>
					<span class="cat-ico" style="--c: {c.color}"
						><Icon name={c.icon} size={16} color={c.color} /></span
					>
					<span class="cat-name">{c.name}</span>
					<button class="icon-btn" onclick={() => openEdit(c)} aria-label="Edit"
						><Icon name="pencil" size={15} /></button
					>
					<button class="icon-btn" onclick={() => (confirmDelete = c)} aria-label="Hapus"
						><Icon name="trash-2" size={15} /></button
					>
				</li>
			{/each}
		</ul>
	</section>

	<section class="card reveal block">
		<h2 class="block-title">Mata Uang</h2>
		<div class="currency-grid">
			{#each SUPPORTED_CURRENCIES as c (c)}
				<button class="cur-pill" class:active={c === currency} onclick={() => setCurrency(c)}
					>{c}</button
				>
			{/each}
		</div>
		<p class="hint">Default currency mempengaruhi format seluruh nominal di app.</p>
	</section>

	<section class="card reveal block">
		<h2 class="block-title">Saldo Awal</h2>
		<p class="hint">Saldo awal masuk ke Total Balance dan dihitung per akun (Cash / Debit).</p>
		<div class="saldo-row">
			<label class="field">
				<span class="flabel">Cash</span>
				<input
					class="finput"
					type="number"
					inputmode="decimal"
					min="0"
					value={settings.value.startingBalanceCash}
					oninput={(e) => setSaldo('startingBalanceCash', e.currentTarget.value)}
				/>
			</label>
			<label class="field">
				<span class="flabel">Debit</span>
				<input
					class="finput"
					type="number"
					inputmode="decimal"
					min="0"
					value={settings.value.startingBalanceDebit}
					oninput={(e) => setSaldo('startingBalanceDebit', e.currentTarget.value)}
				/>
			</label>
		</div>
	</section>

	<section class="card reveal block">
		<h2 class="block-title">Tema</h2>
		<div class="theme-row">
			<button
				class="cur-pill"
				class:active={settings.value.theme === 'light'}
				onclick={() => setTheme('light')}>Light</button
			>
			<button
				class="cur-pill"
				class:active={settings.value.theme === 'dark'}
				onclick={() => setTheme('dark')}>Dark</button
			>
			<button
				class="cur-pill"
				class:active={settings.value.theme === 'auto'}
				onclick={() => setTheme('auto')}>Auto</button
			>
		</div>
		<p class="hint">Auto mengikuti pengaturan mode gelap perangkatmu.</p>
	</section>

	<section class="card reveal block">
		<h2 class="block-title">Aksesibilitas</h2>
		<div class="access-row">
			<span class="access-label">Kurangi animasi</span>
			<button
				class="toggle"
				class:active={settings.value.reduceMotion}
				onclick={toggleReduceMotion}
				aria-pressed={settings.value.reduceMotion}
				aria-label="Kurangi animasi"
			>
				<span class="toggle-thumb"></span>
			</button>
		</div>
		<p class="hint">Mematikan sebagian besar animasi dan transisi di aplikasi.</p>
	</section>

	<section class="card reveal block">
		<h2 class="block-title">Akun Default</h2>
		<p class="hint">Akun yang otomatis terpilih saat menambah catatan baru.</p>
		<div class="theme-row">
			<button
				class="cur-pill"
				class:active={settings.value.defaultAccount === 'cash'}
				onclick={() => setDefaultAccount('cash')}>💵 Cash</button
			>
			<button
				class="cur-pill"
				class:active={settings.value.defaultAccount === 'debit'}
				onclick={() => setDefaultAccount('debit')}>💳 Debit</button
			>
		</div>
	</section>

	<section class="card reveal block">
		<h2 class="block-title">Backup</h2>
		<p class="hint">Export seluruh data ke file JSON, atau impor kembali untuk memulihkan.</p>
		<div class="backup-row">
			<button class="ghost-btn" onclick={exportData}>Export JSON</button>
			<label class="ghost-btn file">
				Import JSON
				<input type="file" accept="application/json" onchange={importData} hidden />
			</label>
		</div>
	</section>

	<!-- Hidden: reset onboarding for testing/demo. -->
	<button class="reset-onb" onclick={resetOnboarding}>Reset Onboarding</button>
</div>

<!-- Category editor modal -->
{#if editing}
	<div class="modal-back" onclick={closeEditor} role="presentation"></div>
	<div class="modal" role="dialog" aria-modal="true" aria-label="Editor kategori">
		<h3>{editing.id ? 'Edit Kategori' : 'Kategori Baru'}</h3>
		<label class="field">
			<span class="flabel">Nama</span>
			<input class="finput" type="text" bind:value={newName} placeholder="Nama kategori" />
		</label>
		<div class="field">
			<span class="flabel">Ikon</span>
			<div class="icon-picker">
				{#each ICON_NAMES as name (name)}
					<button
						class="ico-pick"
						class:active={newIcon === name}
						style="--c: {newColor}"
						onclick={() => (newIcon = name)}
					>
						<Icon {name} size={18} color={newColor} />
					</button>
				{/each}
			</div>
		</div>
		<div class="field">
			<span class="flabel">Warna</span>
			<div class="color-row">
				{#each palette as col (col)}
					<button
						class="color-pick"
						class:active={newColor === col}
						style="background: {col}"
						onclick={() => (newColor = col)}
						aria-label={col}
					></button>
				{/each}
			</div>
		</div>
		<div class="actions">
			<button class="ghost-btn" onclick={closeEditor}>Batal</button>
			<button class="primary-btn" onclick={saveCat}>Simpan</button>
		</div>
	</div>
{/if}

<!-- Delete confirmation -->
{#if confirmDelete}
	{@const cd = confirmDelete}
	<div class="modal-back" onclick={() => (confirmDelete = null)} role="presentation"></div>
	<div class="modal" role="dialog" aria-modal="true" aria-label="Hapus kategori">
		<h3>Hapus "{cd.name}"?</h3>
		<p class="hint">Transaksi lama dengan kategori ini perlu dipindahkan.</p>
		<label class="field">
			<span class="flabel">Pindahkan ke kategori</span>
			<select class="finput" bind:value={moveToId}>
				<option value={null}>— Tandai Uncategorized —</option>
				{#each (cd.type === 'expense' ? expenseCats : incomeCats).filter((c) => c.id !== cd.id) as c (c.id)}
					<option value={c.id}>{c.name}</option>
				{/each}
			</select>
		</label>
		<div class="actions">
			<button class="ghost-btn" onclick={() => (confirmDelete = null)}>Batal</button>
			<button class="danger-btn" onclick={confirmDeleteCat}>Hapus</button>
		</div>
	</div>
{/if}

<style>
	.settings {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.head h1 {
		margin: 4px 2px 6px;
		font-size: 26px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}
	.profile {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 16px 18px;
	}
	.avatar {
		width: 52px;
		height: 52px;
		border-radius: 999px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		color: #fff;
		font-size: 22px;
	}
	.profile-meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}
	.name-input {
		border: none;
		background: transparent;
		font-size: 17px;
		font-weight: 700;
		color: var(--text);
		outline: none;
		padding: 2px 0;
	}
	.sub {
		font-size: 12px;
		color: var(--text-3);
	}
	.block {
		padding: 16px 18px;
	}
	.block-title {
		margin: 0 0 12px;
		font-size: 15px;
		font-weight: 700;
	}
	.block-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}
	.add-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		font-weight: 700;
		color: var(--blue);
		padding: 6px 10px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--blue) 10%, var(--surface));
	}
	.cat-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.cat-list li {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 0;
		border-bottom: 1px solid var(--border);
	}
	.cat-list li:last-child {
		border-bottom: none;
	}
	.cat-ico {
		width: 32px;
		height: 32px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--c) 14%, var(--surface));
	}
	.cat-name {
		flex: 1;
		font-weight: 600;
		font-size: 14px;
	}
	.icon-btn {
		width: 32px;
		height: 32px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-2);
	}
	.icon-btn:hover {
		background: var(--surface-2);
	}
	.saldo-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-top: 12px;
	}
	.saldo-row > .field {
		min-width: 0;
		margin-bottom: 0;
	}
	.currency-grid,
	.theme-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.cur-pill {
		padding: 8px 14px;
		border-radius: 999px;
		background: var(--surface-2);
		font-weight: 700;
		font-size: 13px;
		color: var(--text);
	}
	.cur-pill.active {
		background: #0b0f17;
		color: #fff;
	}
	.hint {
		font-size: 12px;
		color: var(--text-3);
		margin: 10px 0 0;
	}
	.primary-btn {
		width: 100%;
		height: 46px;
		border-radius: 14px;
		background: #0b0f17;
		color: #fff;
		font-weight: 700;
		margin-top: 10px;
	}
	.primary-btn:disabled {
		opacity: 0.5;
	}
	.backup-row {
		display: flex;
		gap: 10px;
		margin-top: 10px;
	}
	.ghost-btn {
		flex: 1;
		height: 42px;
		border-radius: 12px;
		background: var(--surface-2);
		font-weight: 600;
		font-size: 13px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.danger-btn {
		flex: 1;
		height: 42px;
		border-radius: 12px;
		background: var(--red);
		color: #fff;
		font-weight: 700;
	}
	.modal-back {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: rgba(8, 12, 22, 0.45);
		backdrop-filter: blur(2px);
	}
	.modal {
		position: fixed;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		z-index: 61;
		width: min(360px, calc(100vw - 32px));
		background: var(--surface);
		border-radius: 22px;
		padding: 20px;
		box-shadow: var(--shadow-lg);
		max-height: 86dvh;
		overflow-y: auto;
	}
	.modal h3 {
		margin: 0 0 14px;
		font-size: 17px;
		font-weight: 700;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 14px;
	}
	.flabel {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-2);
	}
	.finput {
		width: 100%;
		min-width: 0;
		padding: 11px 12px;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text);
		font-size: 14px;
		outline: none;
	}
	/* Hide number input spin buttons for a cleaner look. */
	.finput[type='number']::-webkit-outer-spin-button,
	.finput[type='number']::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.finput[type='number'] {
		-moz-appearance: textfield;
		appearance: textfield;
	}
	.finput:focus {
		border-color: var(--blue);
	}
	.icon-picker {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 6px;
		max-height: 130px;
		overflow-y: auto;
	}
	.ico-pick {
		height: 36px;
		border-radius: 10px;
		background: var(--surface-2);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ico-pick.active {
		background: color-mix(in srgb, var(--c) 22%, var(--surface));
		outline: 2px solid var(--c);
	}
	.color-row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.color-pick {
		width: 28px;
		height: 28px;
		border-radius: 999px;
		border: 2px solid transparent;
	}
	.color-pick.active {
		border-color: var(--text);
	}
	.actions {
		display: flex;
		gap: 10px;
		margin-top: 6px;
	}
	/* Inside a modal actions row, the primary button should match the others
	   (flex: 1) instead of the full-width standalone style. */
	.actions .primary-btn {
		flex: 1;
		width: auto;
		height: 42px;
		margin-top: 0;
	}
	.reset-onb {
		display: block;
		margin: 16px auto 0;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-3);
		opacity: 0.7;
		padding: 8px;
	}
	.access-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.access-label {
		font-size: 15px;
		font-weight: 500;
		color: var(--text);
	}
	.toggle {
		width: 50px;
		height: 28px;
		border-radius: 999px;
		background: var(--surface-2);
		position: relative;
		transition: background 0.2s ease;
		outline: 2px solid transparent;
	}
	.toggle.active {
		background: var(--accent);
	}
	.toggle-thumb {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--surface);
		box-shadow: var(--shadow-sm);
		transition: transform 0.2s ease;
	}
	.toggle.active .toggle-thumb {
		transform: translateX(22px);
	}
</style>
