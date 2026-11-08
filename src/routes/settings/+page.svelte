<script lang="ts">
	// Akun / Cài đặt: profile, category CRUD, currency, theme & backup.
	import { onMount } from 'svelte';
	import { gsap, EASES } from '$lib/animations/gsap';
	import { motionReduced } from '$lib/state/settings.svelte';
	import { liveQuery } from 'dexie';
	import { db, addCategory, updateCategory, deleteCategory } from '$lib/db';
	import { settings } from '$lib/state/settings.svelte';
	import { createMonthData } from '$lib/state/monthData.svelte';
	import { SUPPORTED_CURRENCIES, formatCurrency, currencySymbol } from '$lib/format/currency';
	import type { Category, TxType } from '$lib/db/schema';
	import Icon, { ICON_NAMES } from '$lib/components/Icon.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import { Switch } from '$lib/components/ui/switch';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from '$lib/components/ui/toaster';

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

	// Bottom-sheet visibility, kept in sync with the entity state above.
	let editorOpen = $state(false);
	let deleteOpen = $state(false);
	let currencyOpen = $state(false);
	let accountOpen = $state(false);

	$effect(() => {
		if (!editorOpen && editing) editing = null;
		if (!deleteOpen && confirmDelete) {
			confirmDelete = null;
			moveToId = null;
		}
	});

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
		editorOpen = true;
	}
	function openEdit(c: Category) {
		editing = { ...c };
		newName = c.name;
		newIcon = c.icon;
		newColor = c.color;
		editorOpen = true;
	}
	async function saveCat() {
		if (!editing || !newName.trim()) return;
		const payload = { name: newName.trim(), icon: newIcon, color: newColor };
		if (editing.id) {
			await updateCategory(editing.id, payload);
		} else {
			await addCategory({ type: editing.type, ...payload, order: editing.order });
		}
		editorOpen = false;
		toast('Kategori disimpan', 'success');
	}
	function askDelete(c: Category) {
		confirmDelete = c;
		moveToId = null;
		deleteOpen = true;
	}
	async function confirmDeleteCat() {
		if (!confirmDelete) return;
		await deleteCategory(confirmDelete.id!, moveToId ?? undefined);
		deleteOpen = false;
		toast('Kategori dihapus', 'success');
	}

	// Currency selector.
	const currency = $derived(settings.value.defaultCurrency);
	async function setCurrency(c: string) {
		await settings.update('defaultCurrency', c);
		currencyOpen = false;
	}

	// Starting balance inputs (Cash / Debit).
	async function setSaldo(key: 'startingBalanceCash' | 'startingBalanceDebit', raw: string) {
		const n = Math.max(0, Number.parseFloat(raw || '0')) || 0;
		await settings.update(key, n);
	}

	// Theme picker (auto / light / dark).
	async function setTheme(t: 'light' | 'dark' | 'auto') {
		await settings.update('theme', t);
	}
	const themeMeta = $derived(
		settings.value.theme === 'light'
			? { icon: 'sun', label: 'Terang' }
			: settings.value.theme === 'dark'
				? { icon: 'moon', label: 'Gelap' }
				: { icon: 'monitor', label: 'Auto' }
	);

	// Reduce animation toggle.
	async function setReduceMotion(v: boolean) {
		await settings.update('reduceMotion', v);
	}

	// Default account (cash/debit) for new transactions.
	async function setDefaultAccount(a: 'cash' | 'debit') {
		await settings.update('defaultAccount', a);
		accountOpen = false;
	}

	// Hidden "Reset onboarding" for testing/demo. Clears the flag then jumps to
	// /onboarding (the root layout guard will keep the user there until finished).
	async function resetOnboarding() {
		await settings.update('hasOnboarded', false);
		if (typeof location !== 'undefined') location.href = '/onboarding';
	}

	// Export / import.
	async function exportData() {
		try {
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
			toast('Backup berhasil diunduh', 'success');
		} catch {
			toast('Export gagal', 'error');
		}
	}
	async function importData(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			const text = await file.text();
			const dump = JSON.parse(text);
			if (dump.categories) await db.categories.bulkPut(dump.categories);
			if (dump.transactions) await db.transactions.bulkPut(dump.transactions);
			if (dump.settings) await db.settings.bulkPut(dump.settings);
			await settings.load();
			toast('Data imported successfully', 'success');
		} catch {
			toast('Import gagal — file tidak valid', 'error');
		} finally {
			input.value = '';
		}
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
		<h1>Cài đặt</h1>
		<p class="sub">Preferensi, kategori &amp; data kamu</p>
	</header>

	<!-- Hồ sơ -->
	<section class="card profile reveal">
		<div class="avatar">{settings.value.userName.charAt(0).toUpperCase()}</div>
		<div class="profile-meta">
			<input
				class="name-input"
				type="text"
				value={settings.value.userName}
				oninput={(e) => settings.update('userName', e.currentTarget.value)}
				aria-label="Nama kamu"
			/>
			<span class="sub t-num">{currency} · {formatCurrency(data.balance, currency)}</span>
		</div>
	</section>

	<!-- Tampilan -->
	<p class="micro-label sec-label reveal">Tampilan</p>
	<section class="card reveal">
		<div class="theme-block">
			<div class="theme-head">
				<span class="ico-bubble"><Icon name={themeMeta.icon} size={18} /></span>
				<div class="row-text">
					<span class="row-title">Tema</span>
					<span class="row-desc">Auto mengikuti mode perangkat</span>
				</div>
			</div>
			<div class="theme-seg">
				<SegmentedControl
					options={[
						{ value: 'auto', label: 'Auto' },
						{ value: 'light', label: 'Terang' },
						{ value: 'dark', label: 'Gelap' }
					]}
					value={settings.value.theme}
					onchange={(v) => setTheme(v as 'light' | 'dark' | 'auto')}
				/>
			</div>
		</div>
		<div class="row-static">
			<span class="ico-bubble"><Icon name="sparkles" size={18} /></span>
			<div class="row-text">
				<span class="row-title">Kurangi animasi</span>
				<span class="row-desc">Matikan sebagian besar animasi</span>
			</div>
			<Switch
				id="reduce-motion"
				checked={settings.value.reduceMotion}
				onCheckedChange={setReduceMotion}
			/>
		</div>
	</section>

	<!-- Umum -->
	<p class="micro-label sec-label reveal">Umum</p>
	<section class="card reveal">
		<button class="row" onclick={() => (currencyOpen = true)}>
			<span class="ico-bubble"><Icon name="banknote" size={18} /></span>
			<div class="row-text">
				<span class="row-title">Đơn vị tiền tệ</span>
				<span class="row-desc">Format nominal di seluruh app</span>
			</div>
			<span class="row-value">{currency}</span>
			<Icon name="chevron-right" size={16} class="shrink-0 text-muted-foreground/60" />
		</button>
		<button class="row" onclick={() => (accountOpen = true)}>
			<span class="ico-bubble"><Icon name="wallet" size={18} /></span>
			<div class="row-text">
				<span class="row-title">Tài khoản mặc định</span>
				<span class="row-desc">Terpilih otomatis saat catat baru</span>
			</div>
			<span class="row-value">{settings.value.defaultAccount === 'cash' ? 'Cash' : 'Debit'}</span>
			<Icon name="chevron-right" size={16} class="shrink-0 text-muted-foreground/60" />
		</button>
		<div class="saldo-rows">
			<div class="row">
				<span class="ico-bubble"><Icon name="piggy-bank" size={18} /></span>
				<div class="row-text">
					<span class="row-title">Saldo awal · Cash</span>
				</div>
				<Input
					type="number"
					inputmode="decimal"
					min="0"
					class="t-num w-32 [appearance:textfield] text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					value={settings.value.startingBalanceCash}
					oninput={(e) => setSaldo('startingBalanceCash', e.currentTarget.value)}
				/>
			</div>
			<div class="row">
				<span class="ico-bubble"><Icon name="piggy-bank" size={18} /></span>
				<div class="row-text">
					<span class="row-title">Saldo awal · Debit</span>
				</div>
				<Input
					type="number"
					inputmode="decimal"
					min="0"
					class="t-num w-32 [appearance:textfield] text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					value={settings.value.startingBalanceDebit}
					oninput={(e) => setSaldo('startingBalanceDebit', e.currentTarget.value)}
				/>
			</div>
		</div>
	</section>

	<!-- Kategori -->
	<p class="micro-label sec-label reveal">Kategori</p>
	<section class="card reveal">
		<div class="cat-head">
			<SegmentedControl
				options={[
					{ value: 'expense', label: 'Pengeluaran' },
					{ value: 'income', label: 'Pemasukan' }
				]}
				value={catTab}
				onchange={(v) => (catTab = v as TxType)}
				size="sm"
			/>
			<Button size="sm" variant="secondary" onclick={openNew}>
				<Icon name="plus" size={15} />
				Baru
			</Button>
		</div>
		<div class="cat-list">
			{#each catTab === 'expense' ? expenseCats : incomeCats as c (c.id)}
				<div class="cat-row">
					<button class="cat-main" onclick={() => openEdit(c)} aria-label="Edit {c.name}">
						<span
							class="cat-ico"
							style="background: color-mix(in oklab, {c.color} 14%, var(--card))"
						>
							<Icon name={c.icon} size={16} color={c.color} />
						</span>
						<span class="row-title">{c.name}</span>
						<Icon name="chevron-right" size={15} class="shrink-0 text-muted-foreground/50" />
					</button>
					<button class="cat-del" onclick={() => askDelete(c)} aria-label="Hapus {c.name}">
						<Icon name="trash-2" size={16} />
					</button>
				</div>
			{/each}
			{#if (catTab === 'expense' ? expenseCats : incomeCats).length === 0}
				<p class="cat-empty">Belum ada kategori.</p>
			{/if}
		</div>
	</section>

	<!-- Data -->
	<p class="micro-label sec-label reveal">DATA</p>
	<section class="card reveal">
		<button class="row" onclick={exportData}>
			<span class="ico-bubble"><Icon name="download" size={18} /></span>
			<div class="row-text">
				<span class="row-title">Xuất dữ liệu</span>
				<span class="row-desc">Tải toàn bộ dữ liệu dạng JSON</span>
			</div>
			<Icon name="chevron-right" size={16} class="shrink-0 text-muted-foreground/60" />
		</button>
		<label class="row">
			<span class="ico-bubble"><Icon name="upload" size={18} /></span>
			<div class="row-text">
				<span class="row-title">Nhập dữ liệu</span>
				<span class="row-desc">Khôi phục từ tệp sao lưu JSON</span>
			</div>
			<Icon name="chevron-right" size={16} class="shrink-0 text-muted-foreground/60" />
			<input type="file" accept="application/json" onchange={importData} hidden />
		</label>
	</section>

	<!-- Hidden: reset onboarding for testing/demo. -->
	<button class="reset-onb reveal" onclick={resetOnboarding}>Đặt lại hướng dẫn ban đầu</button>
</div>

<!-- Category editor (bottom sheet) -->
<Dialog.Root bind:open={editorOpen}>
	<Dialog.Content class="gap-4">
		<Dialog.Title>{editing?.id ? 'Edit Kategori' : 'Kategori Baru'}</Dialog.Title>
		<Dialog.Description class="text-[13px]">
			Berikan nama, ikon, dan warna untuk kategori {editing?.type === 'income'
				? 'pemasukan'
				: 'pengeluaran'}.
		</Dialog.Description>
		{#if editing}
			<div class="sheet-field">
				<Label for="cat-name">Nama</Label>
				<Input id="cat-name" bind:value={newName} placeholder="Nama kategori" />
			</div>
			<div class="sheet-field">
				<Label>Ikon</Label>
				<div class="icon-grid">
					{#each ICON_NAMES as name (name)}
						<button
							class="ico-pick"
							class:active={newIcon === name}
							style="--c: {newColor}"
							onclick={() => (newIcon = name)}
							aria-label={name}
						>
							<Icon {name} size={17} color={newColor} />
						</button>
					{/each}
				</div>
			</div>
			<div class="sheet-field">
				<Label>Warna</Label>
				<div class="color-row">
					{#each palette as col (col)}
						<button
							class="color-pick"
							class:active={newColor === col}
							style="background: {col}"
							onclick={() => (newColor = col)}
							aria-label={col}
						>
							{#if newColor === col}
								<Icon name="check" size={13} class="text-white" />
							{/if}
						</button>
					{/each}
				</div>
			</div>
			<div class="sheet-actions">
				<Dialog.Close>
					<Button variant="outline" class="flex-1">Batal</Button>
				</Dialog.Close>
				<Button class="flex-1" disabled={!newName.trim()} onclick={saveCat}>Simpan</Button>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Delete confirmation (bottom sheet) -->
<Dialog.Root bind:open={deleteOpen}>
	<Dialog.Content class="gap-4">
		<Dialog.Title>Hapus kategori</Dialog.Title>
		<Dialog.Description class="text-[13px]">
			{confirmDelete
				? `Transaksi lama dengan kategori "${confirmDelete.name}" perlu dipindahkan.`
				: 'Transaksi lama dengan kategori ini perlu dipindahkan.'}
		</Dialog.Description>
		{#if confirmDelete}
			{@const cd = confirmDelete}
			<div class="sheet-field">
				<Label for="move-to">Pindahkan transaksi ke</Label>
				<select id="move-to" class="select-input" bind:value={moveToId}>
					<option value={null}>— Tandai Uncategorized —</option>
					{#each (cd.type === 'expense' ? expenseCats : incomeCats).filter((c) => c.id !== cd.id) as c (c.id)}
						<option value={c.id}>{c.name}</option>
					{/each}
				</select>
			</div>
			<div class="sheet-actions">
				<Dialog.Close>
					<Button variant="outline" class="flex-1">Batal</Button>
				</Dialog.Close>
				<Button variant="destructive" class="flex-1" onclick={confirmDeleteCat}>Hapus</Button>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Currency picker (bottom sheet) -->
<Dialog.Root bind:open={currencyOpen}>
	<Dialog.Content class="gap-3">
		<Dialog.Title>Đơn vị tiền tệ</Dialog.Title>
		<Dialog.Description class="text-[13px]">
			Dùng để hiển thị tất cả số tiền trong ứng dụng.
		</Dialog.Description>
		<div class="option-list">
			{#each SUPPORTED_CURRENCIES as c (c)}
				<button
					class="option-row"
					class:active={c === currency}
					onclick={() => setCurrency(c)}
					aria-pressed={c === currency}
				>
					<span class="option-title t-num">{c}</span>
					<span class="option-desc">{currencySymbol(c)}</span>
					{#if c === currency}
						<Icon name="check" size={17} class="ml-auto text-primary" />
					{/if}
				</button>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>

<!-- Default account picker (bottom sheet) -->
<Dialog.Root bind:open={accountOpen}>
	<Dialog.Content class="gap-3">
		<Dialog.Title>Tài khoản mặc định</Dialog.Title>
		<Dialog.Description class="text-[13px]">
			Tự động chọn khi thêm giao dịch mới.
		</Dialog.Description>
		<div class="option-list">
			<button
				class="option-row"
				class:active={settings.value.defaultAccount === 'cash'}
				onclick={() => setDefaultAccount('cash')}
				aria-pressed={settings.value.defaultAccount === 'cash'}
			>
				<span class="ico-bubble"><Icon name="banknote" size={17} /></span>
				<span class="option-title">Cash</span>
				{#if settings.value.defaultAccount === 'cash'}
					<Icon name="check" size={17} class="ml-auto text-primary" />
				{/if}
			</button>
			<button
				class="option-row"
				class:active={settings.value.defaultAccount === 'debit'}
				onclick={() => setDefaultAccount('debit')}
				aria-pressed={settings.value.defaultAccount === 'debit'}
			>
				<span class="ico-bubble"><Icon name="credit-card" size={17} /></span>
				<span class="option-title">Debit</span>
				{#if settings.value.defaultAccount === 'debit'}
					<Icon name="check" size={17} class="ml-auto text-primary" />
				{/if}
			</button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<style>
	.settings {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	/* Header */
	.head {
		padding: 6px 2px 10px;
	}
	.head h1 {
		margin: 0;
		font-size: 26px;
		font-weight: 750;
		letter-spacing: -0.03em;
		color: var(--foreground);
	}
	.head .sub,
	.profile-meta .sub {
		margin: 2px 0 0;
		font-size: 13px;
		color: var(--muted-foreground);
	}

	/* Section label spacing (style comes from global .micro-label) */
	.sec-label {
		margin: 16px 4px 0;
	}

	/* Hồ sơ */
	.profile {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 16px;
	}
	.avatar {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 22px;
		font-weight: 700;
		color: #fff;
		text-shadow: 0 1px 2px oklch(0 0 0 / 0.18);
		background: linear-gradient(135deg, #93c5fd, #c4b5fd);
		flex-shrink: 0;
	}
	.profile-meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}
	.name-input {
		width: 100%;
		min-width: 0;
		padding: 2px 0;
		border: none;
		background: transparent;
		outline: none;
		font-size: 18px;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--foreground);
	}

	/* List rows */
	.row,
	.row-static {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 14px 16px;
		text-align: left;
	}
	button.row,
	label.row {
		cursor: pointer;
	}
	button.row:hover,
	label.row:hover {
		background: var(--muted);
	}
	.theme-block + .row-static,
	.row + .row,
	.row + .saldo-rows,
	.saldo-rows .row + .row,
	.cat-head + .cat-list,
	.cat-row + .cat-row {
		border-top: 1px solid var(--border);
	}
	.ico-bubble {
		width: 34px;
		height: 34px;
		border-radius: 11px;
		background: var(--muted);
		display: grid;
		place-items: center;
		color: var(--foreground);
		flex-shrink: 0;
	}
	.row-text {
		display: flex;
		flex-direction: column;
		gap: 1px;
		flex: 1;
		min-width: 0;
	}
	.row-title {
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--foreground);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		text-align: left;
	}
	.row-desc {
		font-size: 12.5px;
		color: var(--muted-foreground);
	}
	.row-value {
		font-size: 14px;
		font-weight: 600;
		color: var(--muted-foreground);
		flex-shrink: 0;
	}

	/* Theme block */
	.theme-block {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 12px 16px 16px;
	}
	.theme-head {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.theme-seg {
		display: flex;
	}
	.theme-seg :global(.seg) {
		display: flex;
		width: 100%;
	}
	.theme-seg :global(.seg-item) {
		flex: 1;
	}

	/* Categories */
	.cat-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 12px 16px;
	}
	.cat-list {
		padding-bottom: 4px;
	}
	.cat-row {
		display: flex;
		align-items: center;
		padding: 0 8px 0 16px;
	}
	.cat-main {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;
		min-width: 0;
		padding: 13px 0;
		text-align: left;
		cursor: pointer;
	}
	.cat-ico {
		width: 34px;
		height: 34px;
		border-radius: 11px;
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}
	.cat-del {
		width: 36px;
		height: 36px;
		border-radius: 12px;
		display: grid;
		place-items: center;
		color: var(--muted-foreground);
		flex-shrink: 0;
		cursor: pointer;
	}
	.cat-del:hover {
		background: color-mix(in oklab, var(--destructive) 10%, var(--card));
		color: var(--destructive);
	}
	.cat-empty {
		margin: 0;
		padding: 18px 16px;
		font-size: 13.5px;
		color: var(--muted-foreground);
		text-align: center;
	}

	/* Misc page */
	.reset-onb {
		align-self: center;
		margin-top: 18px;
		padding: 8px 14px;
		border: 1px dashed var(--border);
		border-radius: 999px;
		font-size: 12.5px;
		font-weight: 600;
		color: var(--muted-foreground);
	}
	.reset-onb:hover {
		color: var(--destructive);
		border-color: var(--destructive);
	}

	/* Bottom sheets (flat selectors — content is portaled to <body>) */
	.sheet-field {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.sheet-actions {
		display: flex;
		gap: 10px;
		margin-top: 2px;
	}
	.icon-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 6px;
		max-height: 172px;
		overflow-y: auto;
	}
	.ico-pick {
		aspect-ratio: 1;
		display: grid;
		place-items: center;
		border: 1.5px solid var(--border);
		border-radius: 12px;
		background: var(--card);
		cursor: pointer;
	}
	.ico-pick.active {
		border-color: var(--c);
		background: color-mix(in oklab, var(--c) 10%, var(--card));
	}
	.color-row {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.color-pick {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		box-shadow:
			inset 0 0 0 2px var(--card),
			0 0 0 1px var(--border);
		cursor: pointer;
	}
	.color-pick.active {
		box-shadow:
			inset 0 0 0 2px var(--card),
			0 0 0 2px var(--foreground);
	}
	.select-input {
		width: 100%;
		height: 44px;
		padding: 0 12px;
		border: 1px solid var(--input);
		border-radius: 14px;
		background: var(--card);
		font-size: 15px;
		font-weight: 500;
		color: var(--foreground);
		outline: none;
	}
	.select-input:focus-visible {
		border-color: var(--ring);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 25%, transparent);
	}
	.option-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin: 0 -4px;
	}
	.option-row {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 12px 14px;
		border-radius: 14px;
		text-align: left;
		cursor: pointer;
	}
	.option-row:hover {
		background: var(--muted);
	}
	.option-row.active {
		background: color-mix(in oklab, var(--primary) 5%, var(--card));
	}
	.option-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--foreground);
	}
	.option-desc {
		font-size: 13px;
		color: var(--muted-foreground);
	}
</style>
