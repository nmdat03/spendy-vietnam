<script lang="ts">
	// Dashboard (Home). Reactive to IndexedDB via createMonthData().
	import { onMount } from 'svelte';
	import { gsap, EASES } from '$lib/animations/gsap';
	import { motionReduced } from '$lib/state/settings.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { activeMonth } from '$lib/state/month.svelte';
	import { createMonthData } from '$lib/state/monthData.svelte';
	import { formatCurrency } from '$lib/format/currency';
	import BalanceCard from '$lib/components/BalanceCard.svelte';
	import MoneySummaryCard from '$lib/components/MoneySummaryCard.svelte';
	import MonthNavigator from '$lib/components/MonthNavigator.svelte';
	import PieChart, { type PieSlice } from '$lib/components/PieChart.svelte';
	import TransactionRow from '$lib/components/TransactionRow.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import TransactionDetail from '$lib/components/TransactionDetail.svelte';
	import type { Transaction } from '$lib/db/schema';

	const data = createMonthData();

	let period = $state('30D');
	const periods = ['7D', '30D', '90D', '1Y'];
	const periodDays: Record<string, number> = { '7D': 7, '30D': 30, '90D': 90, '1Y': 365 };

	let pieMode = $state<'income' | 'expense'>('expense');

	// Build the trend for the selected period (cumulative balance per day bucket).
	// Starts from the opening balance (starting balances + everything before the
	// period) so the line reflects the real balance over time, not net-from-zero.
	const trend = $derived.by(() => {
		const days = periodDays[period] ?? 30;
		const now = Date.now();
		const start = now - days * 86400_000;
		const all = [...data.allTransactions].sort((a, b) => +new Date(a.date) - +new Date(b.date));
		// Opening balance = starting balances + net of all tx before the period.
		let cum =
			settings.value.startingBalanceCash +
			settings.value.startingBalanceDebit +
			all
				.filter((t) => +new Date(t.date) < start)
				.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
		const points: { label: string; value: number }[] = [];
		const buckets = Math.min(days, 30);
		const span = days / buckets;
		for (let i = 0; i < buckets; i++) {
			const bStart = start + i * span * 86400_000;
			const bEnd = bStart + span * 86400_000;
			for (const t of all) {
				const d = +new Date(t.date);
				if (d >= bStart && d < bEnd) cum += t.type === 'income' ? t.amount : -t.amount;
			}
			points.push({ label: '', value: cum });
		}
		return points;
	});

	// Period change chips: income / expense as a % of the opening balance.
	const periodChange = $derived.by(() => {
		const days = periodDays[period] ?? 30;
		const now = Date.now();
		const start = now - days * 86400_000;
		const inPeriod = data.allTransactions.filter((t) => {
			const d = +new Date(t.date);
			return d >= start && d <= now;
		});
		const opening =
			settings.value.startingBalanceCash +
			settings.value.startingBalanceDebit +
			data.allTransactions
				.filter((t) => +new Date(t.date) < start)
				.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
		const income = inPeriod.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
		const expense = inPeriod.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
		const up = opening > 0 ? (income / opening) * 100 : income > 0 ? 100 : 0;
		const down = opening > 0 ? (expense / opening) * 100 : 0;
		return { up, down };
	});
	const changeUp = $derived(periodChange.up);
	const changeDown = $derived(periodChange.down);

	// Pie chart slices for the active mode.
	const pieSlices = $derived.by<PieSlice[]>(() => {
		const groups = pieMode === 'income' ? data.byCategoryIncome : data.byCategoryExpense;
		return groups.map((g, i) => ({
			id: g.cat?.id ?? i,
			label: g.cat?.name ?? 'Uncategorized',
			value: g.amount,
			color: g.cat?.color ?? '#94a3b8'
		}));
	});

	let pageEl = $state<HTMLElement | null>(null);
	onMount(() => {
		if (pageEl && !motionReduced()) {
			gsap.from(pageEl.querySelectorAll('.reveal'), {
				y: 16,
				opacity: 0,
				duration: 0.5,
				ease: EASES.out,
				stagger: 0.06
			});
		}
	});

	const recent = $derived(
		[...data.transactions].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 6)
	);

	let selectedTx = $state<Transaction | null>(null);
</script>

<div class="dash" bind:this={pageEl}>
	<header class="head reveal">
		<div class="who">
			<span class="hi">Hi, {settings.value.userName}</span>
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg
			>
		</div>
		<div class="avatar" style="background: linear-gradient(135deg, #93c5fd, #c4b5fd)">
			{settings.value.userName.charAt(0).toUpperCase()}
		</div>
	</header>

	<div class="reveal">
		<BalanceCard
			balance={data.balance}
			currency={settings.value.defaultCurrency}
			{period}
			{periods}
			onPeriodChange={(p) => (period = p)}
			{trend}
			{changeUp}
			{changeDown}
		/>
	</div>

	<div class="account-row reveal">
		<div class="acc cash">
			<span class="acc-dot"></span>
			<span class="acc-label">Cash</span>
			<span class="acc-val">{formatCurrency(data.balanceCash, settings.value.defaultCurrency)}</span
			>
		</div>
		<div class="acc debit">
			<span class="acc-dot"></span>
			<span class="acc-label">Debit</span>
			<span class="acc-val"
				>{formatCurrency(data.balanceDebit, settings.value.defaultCurrency)}</span
			>
		</div>
	</div>

	<div class="month-row reveal"><MonthNavigator /></div>

	<div class="summary-row reveal">
		<MoneySummaryCard
			title="Money In"
			value={data.monthIn}
			currency={settings.value.defaultCurrency}
			kind="in"
			highlight={[4, 5]}
			href="/money/in"
		/>
		<MoneySummaryCard
			title="Money Spent"
			value={data.monthSpent}
			currency={settings.value.defaultCurrency}
			kind="spent"
			highlight={[3, 5]}
			href="/money/spent"
		/>
	</div>

	<section class="card section reveal">
		<div class="section-head">
			<h3>Categories</h3>
			<SegmentedControl
				options={[
					{ value: 'expense', label: 'Pengeluaran' },
					{ value: 'income', label: 'Pemasukan' }
				]}
				value={pieMode}
				onchange={(v) => (pieMode = v as 'income' | 'expense')}
				size="sm"
			/>
		</div>
		{#if pieSlices.length === 0}
			<p class="empty">
				Belum ada transaksi {pieMode === 'income' ? 'pemasukan' : 'pengeluaran'} bulan ini.
			</p>
		{:else}
			<div class="pie-row">
				<PieChart
					slices={pieSlices}
					size={180}
					centerValue={Math.round(
						pieMode === 'income' ? data.monthIn : data.monthSpent
					).toLocaleString('en-US')}
					centerLabel={pieMode === 'income' ? 'In' : 'Spent'}
				/>
				<ul class="legend">
					{#each pieSlices.slice(0, 6) as s (s.id)}
						<li>
							<span class="dot" style="background: {s.color}"></span>
							<span class="leg-name">{s.label}</span>
							<span class="leg-val"
								>{Math.round(
									(s.value / (pieSlices.reduce((a, b) => a + b.value, 0) || 1)) * 100
								)}%</span
							>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>

	<section class="card section reveal">
		<div class="section-head">
			<h3>Transaksi Terbaru</h3>
			<a href="/money/spent" class="see-all">Lihat semua</a>
		</div>
		{#if recent.length === 0}
			<p class="empty">
				Belum ada transaksi bulan ini. Tekan tombol <strong>Add</strong> untuk mencatat.
			</p>
		{:else}
			<div role="list">
				{#each recent as t (t.id)}
					<TransactionRow
						tx={t}
						category={data.catsById.get(t.categoryId)}
						currency={settings.value.defaultCurrency}
						onSelect={(tx) => (selectedTx = tx)}
					/>
				{/each}
			</div>
		{/if}
	</section>
</div>

<TransactionDetail
	tx={selectedTx}
	category={selectedTx ? data.catsById.get(selectedTx.categoryId) : undefined}
	currency={settings.value.defaultCurrency}
	onClose={() => (selectedTx = null)}
/>

<style>
	.dash {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 4px 2px 8px;
	}
	.who {
		display: flex;
		align-items: center;
		gap: 4px;
		color: var(--text-2);
	}
	.hi {
		font-size: 15px;
		font-weight: 600;
		color: var(--text);
	}
	.avatar {
		width: 38px;
		height: 38px;
		border-radius: 999px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		color: #fff;
		font-size: 15px;
		box-shadow: var(--shadow-sm);
	}
	.month-row {
		display: flex;
		justify-content: center;
		padding: 4px 0;
	}
	.account-row {
		display: flex;
		gap: 12px;
	}
	.acc {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--surface);
		border-radius: var(--r-md);
		box-shadow: var(--shadow-sm);
		padding: 12px 14px;
	}
	.acc-dot {
		width: 9px;
		height: 9px;
		border-radius: 999px;
		flex-shrink: 0;
	}
	.acc.cash .acc-dot {
		background: var(--green);
	}
	.acc.debit .acc-dot {
		background: var(--blue);
	}
	.acc-label {
		font-size: 12px;
		color: var(--text-2);
		font-weight: 600;
	}
	.acc-val {
		margin-left: auto;
		font-size: 14px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}
	.summary-row {
		display: flex;
		gap: 12px;
	}
	.section {
		padding: 16px 18px 14px;
	}
	.section-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}
	.section-head h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
	}
	.see-all {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-2);
	}
	.pie-row {
		display: flex;
		gap: 16px;
		align-items: center;
	}
	.legend {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
		min-width: 0;
	}
	.legend li {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}
	.dot {
		width: 9px;
		height: 9px;
		border-radius: 999px;
		flex-shrink: 0;
	}
	.leg-name {
		flex: 1;
		color: var(--text);
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.leg-val {
		font-weight: 700;
		color: var(--text-2);
	}
	.empty {
		font-size: 13px;
		color: var(--text-2);
		text-align: center;
		padding: 16px 0;
	}
</style>
