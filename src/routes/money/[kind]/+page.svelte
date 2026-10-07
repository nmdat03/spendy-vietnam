<script lang="ts">
	// Money Movement detail page. Shared by /money/in and /money/spent.
	// Hero total (big ink numerals) + violet monthly bar chart + transactions
	// list + month navigator. Tapping a segment switches kind.
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

	const formattedTotal = $derived(
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: settings.value.defaultCurrency,
			maximumFractionDigits: settings.value.defaultCurrency === 'IDR' ? 0 : 2
		}).format(total)
	);

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

	<header class="hero reveal">
		<span class="micro-label">{title}</span>
		<h1 class="total t-num">{formattedTotal}</h1>
		<div class="month-label">{monthLabel(activeMonth.value)}</div>
	</header>

	<section class="card chart-card reveal">
		<div class="chart-head">
			<span class="micro-label">6 bulan terakhir</span>
		</div>
		<BarChart bars={monthBars} height={170} color="var(--violet)" />
	</section>

	<div class="month-row reveal"><MonthNavigator /></div>

	<section class="card list reveal">
		<div class="list-head">
			<span class="micro-label">Transaksi</span>
			{#if listTxs.length > 0}
				<span class="count t-num">{listTxs.length}</span>
			{/if}
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
		gap: 14px;
	}
	.tabs {
		display: flex;
		justify-content: center;
		padding: 2px 0;
	}
	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		text-align: center;
		padding: 6px 0 2px;
	}
	.total {
		margin: 2px 0 0;
		font-size: clamp(40px, 11vw, 50px);
		font-weight: 800;
		line-height: 1.04;
		color: var(--foreground);
	}
	.month-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--muted-foreground);
	}
	.chart-card {
		padding: 16px 14px 12px;
		box-shadow: var(--shadow-md);
	}
	.chart-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2px 4px 12px;
	}
	.month-row {
		display: flex;
		justify-content: center;
		padding: 2px 0;
	}
	.list {
		padding: 4px 16px 10px;
		box-shadow: var(--shadow-md);
	}
	.list-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 0 6px;
	}
	.count {
		font-size: 12px;
		font-weight: 700;
		color: var(--muted-foreground);
		background: var(--muted);
		padding: 3px 9px;
		border-radius: 999px;
	}
	.empty {
		margin: 0;
		font-size: 13px;
		color: var(--muted-foreground);
		text-align: center;
		padding: 20px 0 16px;
	}
</style>
