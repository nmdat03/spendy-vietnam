<script lang="ts">
	// Tambah Catatan: 4-step wizard presented as a slide-up bottom sheet.
	//
	// UX NOTE on step order: the spec lists (1) Nominal, (2) Kategori, (3) Jenis,
	// (4) Waktu & Catatan, but allows swapping steps 2 & 3 when it yields better
	// UX. We swap them: Jenis is picked BEFORE Kategori so the category grid can
	// be filtered to only income/expense categories — avoids picking a category
	// that doesn't match the chosen type. So our order is:
	//   Step 1 Nominal → Step 2 Jenis → Step 3 Kategori → Step 4 Waktu & Review.
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { gsap, EASES, prefersReducedMotion } from '$lib/animations/gsap';
	import { liveQuery } from 'dexie';
	import { db, addTransaction } from '$lib/db';
	import { settings } from '$lib/state/settings.svelte';
	import type { Account, Category, TxType } from '$lib/db/schema';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import AmountKeypad from '$lib/components/AmountKeypad.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import CategoryChip from '$lib/components/CategoryChip.svelte';
	import SlotNumber from '$lib/components/SlotNumber.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const reduced = prefersReducedMotion();

	let step = $state(0); // 0..3
	const stepTitles = ['Nominal', 'Jenis', 'Kategori', 'Waktu & Catatan'];

	let rawAmount = $state('');
	let jenis = $state<TxType>('expense');
	let account = $state<Account>(settings.value.defaultAccount);
	let categoryId = $state<number | null>(null);
	let note = $state('');
	let when = $state<string>(nowLocal());

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

	const canNext = $derived(
		(step === 0 && amountNum > 0) ||
			(step === 1 && !!jenis) ||
			(step === 2 && categoryId !== null) ||
			step === 3
	);

	let track = $state<HTMLElement | null>(null);
	$effect(() => {
		step;
		if (!track) return;
		// Track is 400% wide (4 steps x 25% each), so one step = 25% of the track's
		// own width. xPercent is relative to the element's width, hence -step * 25.
		if (reduced) {
			gsap.set(track, { xPercent: -step * 25 });
			return;
		}
		gsap.to(track, { xPercent: -step * 25, duration: 0.45, ease: EASES.out });
	});

	function next() {
		if (!canNext) return;
		if (step < 3) step++;
		else submit();
	}
	function back() {
		if (step > 0) step--;
		else close();
	}
	function close() {
		void goto('/');
	}

	function selectCategory(c: Category) {
		categoryId = c.id!;
		if (reduced) {
			step = 3;
			return;
		}
		setTimeout(() => (step = 3), 420);
	}

	// Step 2 (Jenis): picking Pemasukan/Pengeluaran auto-advances to Kategori —
	// no "Lanjut" tap needed. Same pattern as the category step.
	function pickJenis(v: string) {
		jenis = v as TxType;
		categoryId = null;
		if (reduced) {
			step = 2;
			return;
		}
		setTimeout(() => {
			if (step === 1) step = 2;
		}, 380);
	}

	let gridEl = $state<HTMLElement | null>(null);
	$effect(() => {
		step;
		if (step === 2 && gridEl && !reduced) {
			const id = requestAnimationFrame(() => {
				gsap.from(gridEl!.querySelectorAll('.chip'), {
					y: 14,
					opacity: 0,
					duration: 0.4,
					ease: EASES.out,
					stagger: 0.045
				});
			});
			return () => cancelAnimationFrame(id);
		}
	});

	let reviewEl = $state<HTMLElement | null>(null);
	$effect(() => {
		step;
		if (step === 3 && reviewEl && !reduced) {
			const id = requestAnimationFrame(() => {
				gsap.from(reviewEl, { y: 18, opacity: 0, duration: 0.5, ease: EASES.out });
			});
			return () => cancelAnimationFrame(id);
		}
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
	if (submitBtn && !reduced) {
		gsap.fromTo(
			submitBtn,
			{ scale: 0.7, opacity: 0.5 },
			{ scale: 1, opacity: 1, duration: 0.5, ease: EASES.outBack }
		);
	}
	await new Promise((r) => setTimeout(r, 900));
	close();
}

	onDestroy(() => {
		gsap.killTweensOf([track, gridEl, reviewEl, submitBtn].filter(Boolean) as HTMLElement[]);
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
</script>

<BottomSheet open={true} title={`Tambah Catatan · ${stepTitles[step]}`} onClose={close}>
	<div class="dots" aria-hidden="true">
		{#each [0, 1, 2, 3] as i (i)}
			<span class="dot" class:active={step >= i}></span>
		{/each}
	</div>

	<div class="viewport">
		<div class="track" bind:this={track}>
			<section class="step">
				<AmountKeypad
					value={rawAmount}
					{currency}
					{allowDecimal}
					onchange={(v) => (rawAmount = v)}
				/>
			</section>

			<section class="step center-vert">
				<div class="step-title">Pilih jenis transaksi</div>
				<SegmentedControl
					options={[{ value: 'expense', label: 'Pengeluaran' }, { value: 'income', label: 'Pemasukan' }]}
					value={jenis}
					onchange={pickJenis}
					size="md"
				/>
				<div class="jenis-hint">Pilih salah satu untuk lanjut</div>
			</section>

			<section class="step">
				<div class="step-title">Pilih kategori</div>
				<div class="grid" bind:this={gridEl}>
					{#each filteredCats as c (c.id)}
						<CategoryChip category={c} selected={categoryId === c.id} onselect={selectCategory} />
					{/each}
				</div>
			</section>

			<section class="step">
				<div class="review-card" bind:this={reviewEl}>
					<div class="review-amt">
						<SlotNumber
							value={jenis === 'income' ? amountNum : -amountNum}
							{currency}
							duration={1.3}
							stagger={0.06}
						/>
					</div>
					<div class="review-meta">
						<span class="pill" style="--c: {selectedCat?.color ?? '#94a3b8'}">
							<Icon name={selectedCat?.icon ?? 'circle-ellipsis'} size={14} color={selectedCat?.color ?? '#94a3b8'} />
							{selectedCat?.name ?? 'Uncategorized'}
						</span>
						<span class="pill-type">{jenis === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span>
						<span class="pill-type acc">{account === 'cash' ? 'Cash' : 'Debit'}</span>
					</div>
				</div>

				<div class="field full">
					<span class="flabel">Akun</span>
					<SegmentedControl
						options={[{ value: 'cash', label: 'Cash' }, { value: 'debit', label: 'Debit' }]}
						value={account}
						onchange={(v) => (account = v as Account)}
						size="sm"
					/>
				</div>

				<div class="field-row">
					<label class="field">
						<span class="flabel">Tanggal</span>
						<input class="finput" type="date" value={datePart} oninput={(e) => onDate(e.currentTarget.value)} />
					</label>
					<label class="field">
						<span class="flabel">Jam</span>
						<input class="finput" type="time" value={timePart} oninput={(e) => onTime(e.currentTarget.value)} />
					</label>
				</div>
				<label class="field full">
					<span class="flabel">Catatan (opsional)</span>
					<input class="finput" type="text" placeholder="Tambahkan catatan…" bind:value={note} />
				</label>
			</section>
		</div>
	</div>

	<div class="actions">
		<button class="btn ghost" onclick={back}>{step === 0 ? 'Batal' : 'Kembali'}</button>
		{#if step === 0 || step === 3}
			<button
				class="btn primary"
				bind:this={submitBtn}
				disabled={!canNext || phase !== 'idle'}
				onclick={next}
			>
				{#if phase === 'idle'}
					{step === 3 ? 'Simpan' : 'Lanjut'}
				{:else if phase === 'loading'}
					Menyimpan…
				{:else}
					<span class="ok">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
						Tersimpan
					</span>
				{/if}
			</button>
		{/if}
	</div>
</BottomSheet>

<style>
	.dots {
		display: flex;
		gap: 6px;
		justify-content: center;
		margin-bottom: 14px;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--border);
		transition: background 0.3s ease, width 0.3s ease;
	}
	.dot.active {
		background: var(--blue);
		width: 18px;
	}
	.viewport {
		overflow: hidden;
	}
	.track {
		display: flex;
		width: 400%;
		will-change: transform;
	}
	.step {
		width: 25%;
		flex-shrink: 0;
		padding: 0 4px 8px;
		min-height: 320px;
		display: flex;
		flex-direction: column;
	}
	.step.center-vert {
		justify-content: center;
		align-items: center;
		gap: 22px;
		padding: 30px 4px;
	}
	.step-title {
		font-size: 16px;
		font-weight: 700;
		margin-bottom: 14px;
	}
	.jenis-hint {
		font-size: 13px;
		color: var(--text-2);
		text-align: center;
		max-width: 260px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
	}
	.review-card {
		background: var(--surface-2);
		border-radius: var(--r-lg);
		padding: 18px 20px;
		margin-bottom: 16px;
		text-align: center;
	}
	.review-amt {
		font-size: 30px;
		font-weight: 800;
		margin-bottom: 10px;
		letter-spacing: -0.02em;
	}
	.review-meta {
		display: flex;
		gap: 8px;
		justify-content: center;
		align-items: center;
	}
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 11px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 600;
		background: color-mix(in srgb, var(--c) 14%, var(--surface));
	}
	.pill-type {
		display: inline-flex;
		padding: 5px 11px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 600;
		background: var(--surface);
		color: var(--text-2);
	}
	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-bottom: 10px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.field.full {
		margin-bottom: 6px;
	}
	.flabel {
		font-size: 12px;
		color: var(--text-2);
		font-weight: 600;
	}
	.finput {
		padding: 12px 14px;
		border-radius: 14px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text);
		font-size: 15px;
		font-weight: 500;
		outline: none;
	}
	.finput:focus {
		border-color: var(--blue);
	}
	.actions {
		display: flex;
		gap: 10px;
		margin-top: 18px;
	}
	.btn {
		flex: 1;
		height: 50px;
		border-radius: 16px;
		font-weight: 700;
		font-size: 15px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}
	.btn.ghost {
		background: var(--surface-2);
		color: var(--text);
	}
	.btn.primary {
		background: #0b0f17;
		color: #fff;
	}
	.btn.primary:disabled {
		opacity: 0.4;
	}
	.ok {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--green);
	}
</style>