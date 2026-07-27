<script lang="ts">
	// Money Movement detail page. Shared by /money/in and /money/spent.
	// Big monthly bar chart (active month highlighted) + transactions list +
	// month navigator. Tapping a segment switches kind.
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { gsap, EASES } from '$lib/animations/gsap';
	import { motionReduced } from '$lib/state/settings.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { activeMonth, monthBounds, monthLabel } from '$lib/state/month.svelte';
	import { createMonthData } from '$lib/state/monthData.svelte';
	import BarChart from '$lib/components/BarChart.svelte';
	import MonthNavigator from '$lib/components/MonthNavigator.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import TransactionRow from '$lib/components/TransactionRow.svelte';
	import TransactionDetail from '$lib/components/TransactionDetail.svelte';
	import type { Transaction } from '$lib/db/schema';

	const data = createMonthData();

	// Derive kind from the route param.
	const kind = $derived($page.params.kind === 'in' ? 'in' : 'spent');
	const txType = $derived(kind === 'in' ? 'income' : 'expense');
	const color = $derived(kind === 'in' ? 'var(--green)' : 'var(--red)');
	const title = $derived(kind === 'in' ? 'Money in' : 'Money spent');

	// Last 6 months of totals for the bar chart, with the active month highlighted.
	const monthBars = $derived.by(() => {
		const bars: { label: string; value: number; active?: boolean }[] = [];
		const ref = activeMonth.value;
		for (let i = 5; i >= 0; i--) {
			const d = new Date(ref.year, ref.month - i, 1);
			const { start, end } = monthBounds({ year: d.getFullYear(), month: d.getMonth() });
			const total = data.allTransactions
				.filter((t) => t.type === txType)
				.filter((t) => {
					const td = new Date(t.date);
					return td >= start && td <= end;
				})
				.reduce((s, t) => s + t.amount, 0);
			bars.push({
				label: d.toLocaleDateString('en-US', { month: 'short' }),
				value: total,
				active: i === 0
			});
		}
		return bars;
	});

	const listTxs = $derived(
		data.transactions
			.filter((t) => t.type === txType)
			.sort((a, b) => +new Date(b.date) - +new Date(a.date))
	);

	const total = $derived(kind === 'in' ? data.monthIn : data.monthSpent);

	function switchKind(v: string) {
		void goto(`/money/${v}`);
	}

	let root = $state<HTMLElement | null>(null);
	onMount(() => {
		if (root && !motionReduced()) {
			gsap.from(root.querySelectorAll('.reveal'), {
				y: 14,
				opacity: 0,
				duration: 0.5,
				ease: EASES.out,
				stagger: 0.06
			});
		}
	});
	onDestroy(() => gsap.killTweensOf(root));

	let selectedTx = $state<Transaction | null>(null);
</script>

<div class="money" bind:this={root}>
	<div class="tabs reveal">
		<SegmentedControl
			options={[
				{ value: 'in', label: 'Money in' },
				{ value: 'spent', label: 'Money spent' }
			]}
			value={kind}
			onchange={switchKind}
			size="md"
		/>
	</div>

	<h1 class="title reveal">{title}</h1>
	<div class="total reveal">
		{new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: settings.value.defaultCurrency,
			maximumFractionDigits: settings.value.defaultCurrency === 'IDR' ? 0 : 2
		}).format(total)}
	</div>
	<div class="month-label reveal">{monthLabel(activeMonth.value)}</div>

	<div class="chart-card card reveal">
		<BarChart bars={monthBars} height={170} {color} />
	</div>

	<div class="month-row reveal"><MonthNavigator /></div>

	<section class="card list reveal">
		<div class="list-head">
			<h3>Transaksi</h3>
			<span class="count">{listTxs.length}</span>
		</div>
		{#if listTxs.length === 0}
			<p class="empty">
				Belum ada transaksi {kind === 'in' ? 'pemasukan' : 'pengeluaran'} bulan ini.
			</p>
		{:else}
			<div role="list">
				{#each listTxs as t (t.id)}
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
	.money {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.tabs {
		display: flex;
		justify-content: center;
		padding: 4px 0 8px;
	}
	.title {
		text-align: center;
		font-size: 26px;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin: 4px 0 2px;
	}
	.total {
		text-align: center;
		font-size: 38px;
		font-weight: 800;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}
	.month-label {
		text-align: center;
		font-size: 13px;
		color: var(--text-3);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 6px;
	}
	.chart-card {
		padding: 18px 16px 14px;
	}
	.month-row {
		display: flex;
		justify-content: center;
		padding: 6px 0;
	}
	.list {
		padding: 14px 16px 10px;
	}
	.list-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 6px;
	}
	.list-head h3 {
		margin: 0;
		font-size: 15px;
		font-weight: 700;
	}
	.count {
		font-size: 12px;
		font-weight: 700;
		color: var(--text-3);
		background: var(--surface-2);
		padding: 2px 8px;
		border-radius: 999px;
	}
	.empty {
		font-size: 13px;
		color: var(--text-2);
		text-align: center;
		padding: 18px 0;
	}
</style>
