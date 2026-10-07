<script lang="ts">
	// Catatan Baru — single-screen quick entry (fintech style, no wizard).
	//
	// Vertical flow, thumb-friendly: type switch → big amount + keypad →
	// category pills → quiet detail rows (account / date-time / note) →
	// full-width save pill that stays in reach (sticky). Replaces the old
	// 4-step wizard; all state, validation and db logic is unchanged.
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { gsap, EASES } from '$lib/animations/gsap';
	import { motionReduced } from '$lib/state/settings.svelte';
	import { liveQuery } from 'dexie';
	import { db, addTransaction } from '$lib/db';
	import { settings } from '$lib/state/settings.svelte';
	import type { Account, Category, TxType } from '$lib/db/schema';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import AmountKeypad from '$lib/components/AmountKeypad.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import CategoryChip from '$lib/components/CategoryChip.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Button } from '$lib/components/ui/button';

	let rawAmount = $state('');
	let jenis = $state<TxType>('expense');
	let account = $state<Account>(settings.value.defaultAccount);
	let categoryId = $state<number | null>(null);
	let note = $state('');
	let when = $state<string>(nowLocal());
	let whenOpen = $state(false);

	function nowLocal(): string {
		const d = new Date();
		d.setSeconds(0, 0);
		return d.toISOString();
	}

	let categories = $state<Category[]>([]);
	$effect(() => {
		const sub = liveQuery(() => db.categories.toArray()).subscribe({
			next: (c) => (categories = c)
		});
		return () => sub.unsubscribe();
	});

	const currency = $derived(settings.value.defaultCurrency);
	const allowDecimal = $derived(
		currency !== 'IDR' && currency !== 'JPY' && currency !== 'KRW' && currency !== 'VND'
	);
	const filteredCats = $derived(
		categories.filter((c) => c.type === jenis).sort((a, b) => a.order - b.order)
	);
	const amountNum = $derived(Number.parseFloat(rawAmount || '0'));

	// Required inputs: amount + category (same rule as the old wizard steps).
	const canSave = $derived(amountNum > 0 && categoryId !== null);

	const saveLabel = $derived(
		!canSave && amountNum > 0 ? 'Pilih kategori dulu' : 'Simpan Transaksi'
	);

	// Switching type invalidates the picked category (existing behaviour).
	function pickJenis(v: string) {
		jenis = v as TxType;
		categoryId = null;
	}

	function selectCategory(c: Category) {
		categoryId = c.id!;
	}

	// One-shot entrance stagger for the content blocks (keypad stays instant).
	let entered = false;
	let bodyEl = $state<HTMLElement | null>(null);
	$effect(() => {
		if (!bodyEl || entered) return;
		entered = true;
		if (motionReduced()) return;
		gsap.from(bodyEl.querySelectorAll('[data-enter]'), {
			y: 16,
			opacity: 0,
			duration: 0.5,
			ease: EASES.out,
			stagger: 0.07,
			clearProps: 'all'
		});
	});

	let phase = $state<'idle' | 'loading' | 'done'>('idle');
	let submitBtn = $state<HTMLElement | null>(null);

	async function submit() {
		if (phase !== 'idle') return;
		phase = 'loading';
		const whenDate = new Date(when);
		await addTransaction({
			type: jenis,
			account,
			categoryId: categoryId ?? 0,
			amount: amountNum,
			currency,
			note,
			date: whenDate.toISOString()
		});
		await new Promise((r) => setTimeout(r, 350));
		phase = 'done';
		if (submitBtn && !motionReduced()) {
			gsap.fromTo(
				submitBtn,
				{ scale: 0.7, opacity: 0.5 },
				{ scale: 1, opacity: 1, duration: 0.5, ease: EASES.outBack }
			);
		}
		await new Promise((r) => setTimeout(r, 900));
		close();
	}

	function close() {
		void goto('/');
	}

	onDestroy(() => {
		gsap.killTweensOf([bodyEl, submitBtn].filter(Boolean) as HTMLElement[]);
	});

	const selectedCat = $derived(categories.find((c) => c.id === categoryId));

	const datePart = $derived(localDate(when));
	const timePart = $derived(localTime(when));
	// `when` is stored as a UTC ISO string; the date/time inputs need LOCAL values,
	// so derive them from the local getters (not by slicing the ISO string, which
	// would return UTC and show the wrong time).
	function localDate(iso: string): string {
		const d = new Date(iso);
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${d.getFullYear()}-${m}-${day}`;
	}
	function localTime(iso: string): string {
		const d = new Date(iso);
		return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
	}
	function onDate(v: string) {
		// v is a local "YYYY-MM-DD"; combine with the current local time and parse
		// as local (a datetime without timezone is treated as local).
		const d = new Date(`${v}T${timePart || '00:00'}`);
		when = d.toISOString();
	}
	function onTime(v: string) {
		const d = new Date(`${datePart}T${v || '00:00'}`);
		when = d.toISOString();
	}

	const whenLabel = $derived(
		new Date(when).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) +
			' · ' +
			localTime(when)
	);
</script>

<BottomSheet open={true} title="Catatan Baru" onClose={close}>
	<div class="entry" bind:this={bodyEl}>
		<div class="type-row" data-enter>
			<SegmentedControl
				options={[
					{ value: 'expense', label: 'Pengeluaran' },
					{ value: 'income', label: 'Pemasukan' }
				]}
				value={jenis}
				onchange={pickJenis}
			/>
		</div>

		<AmountKeypad value={rawAmount} {currency} {allowDecimal} onchange={(v) => (rawAmount = v)} />

		<div class="cats" data-enter>
			<span class="micro-label cats-label">Kategori</span>
			<div class="chips no-scrollbar">
				{#each filteredCats as c (c.id)}
					<CategoryChip category={c} selected={categoryId === c.id} onselect={selectCategory} />
				{/each}
				{#if filteredCats.length === 0}
					<span class="empty-cats">Belum ada kategori untuk jenis ini</span>
				{/if}
			</div>
		</div>

		<div class="details" data-enter>
			<div class="d-row">
				<span class="d-icon"><Icon name="wallet" size={14} /></span>
				<span class="d-label">Akun</span>
				<div class="d-ctrl">
					<SegmentedControl
						options={[
							{ value: 'cash', label: 'Cash' },
							{ value: 'debit', label: 'Debit' }
						]}
						value={account}
						onchange={(v) => (account = v as Account)}
						size="sm"
					/>
				</div>
			</div>

			<div class="d-row">
				<span class="d-icon"><Icon name="calendar-days" size={14} /></span>
				<span class="d-label">Waktu</span>
				<button class="d-toggle" onclick={() => (whenOpen = !whenOpen)} aria-expanded={whenOpen}>
					<span class="d-value t-num">{whenLabel}</span>
					<span class="chev" class:open={whenOpen}><Icon name="chevron-down" size={14} /></span>
				</button>
			</div>

			{#if whenOpen}
				<div class="when-grid animate-pop-in">
					<label class="wfield">
						<span class="micro-label">Tanggal</span>
						<input
							class="finput"
							type="date"
							value={datePart}
							oninput={(e) => onDate(e.currentTarget.value)}
						/>
					</label>
					<label class="wfield">
						<span class="micro-label">Jam</span>
						<input
							class="finput"
							type="time"
							value={timePart}
							oninput={(e) => onTime(e.currentTarget.value)}
						/>
					</label>
				</div>
			{/if}

			<div class="d-row note-row">
				<span class="d-icon"><Icon name="pencil" size={14} /></span>
				<input class="note-input" type="text" placeholder="Tambahkan catatan…" bind:value={note} />
			</div>
		</div>

		<div class="save-wrap" bind:this={submitBtn} data-enter>
			<Button size="lg" class="w-full" disabled={!canSave || phase !== 'idle'} onclick={submit}>
				{#if phase === 'idle'}
					{saveLabel}
				{:else if phase === 'loading'}
					Menyimpan…
				{:else}
					<span class="ok">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg
						>
						Tersimpan
					</span>
				{/if}
			</Button>
		</div>
	</div>
</BottomSheet>

<style>
	.entry {
		display: flex;
		flex-direction: column;
	}
	.type-row {
		display: flex;
		justify-content: center;
		padding: 2px 0 8px;
	}
	.cats {
		margin-top: 20px;
	}
	.cats-label {
		display: block;
		margin: 0 2px 10px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		max-height: 150px;
		overflow-y: auto;
	}
	.empty-cats {
		font-size: 13px;
		color: var(--text-3);
		padding: 4px 2px;
	}
	.details {
		margin-top: 18px;
		background: var(--muted);
		border-radius: var(--r-lg);
		padding: 2px 14px;
	}
	.d-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 0;
		border-bottom: 1px solid var(--border);
	}
	.d-row:last-child {
		border-bottom: none;
	}
	.d-icon {
		width: 26px;
		height: 26px;
		flex-shrink: 0;
		border-radius: 999px;
		background: var(--card);
		color: var(--muted-foreground);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.d-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--muted-foreground);
	}
	.d-ctrl {
		margin-left: auto;
	}
	.d-toggle {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 12px;
		border-radius: 999px;
		background: var(--card);
		font-size: 13px;
		font-weight: 600;
		color: var(--foreground);
	}
	.d-value {
		line-height: 1;
	}
	.chev {
		display: flex;
		color: var(--muted-foreground);
		transition: transform 0.2s ease;
	}
	.chev.open {
		transform: rotate(180deg);
	}
	.when-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		padding: 12px 0 14px 36px;
		border-bottom: 1px solid var(--border);
	}
	.wfield {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.finput {
		width: 100%;
		padding: 10px 12px;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--card);
		color: var(--foreground);
		font-size: 14px;
		font-weight: 500;
		outline: none;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}
	.finput:focus {
		border-color: var(--violet);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--violet) 14%, transparent);
	}
	.note-row {
		gap: 10px;
	}
	.note-input {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: none;
		outline: none;
		font-size: 14px;
		font-weight: 500;
		color: var(--foreground);
		padding: 4px 0;
	}
	.note-input::placeholder {
		color: var(--text-3);
	}
	.save-wrap {
		position: sticky;
		bottom: 0;
		margin-top: 16px;
		padding: 12px 0 4px;
		background: linear-gradient(to top, var(--card) 72%, transparent);
	}
	.ok {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--success);
	}
</style>
