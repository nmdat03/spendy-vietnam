<script lang="ts">
	// Dashboard (Home). Reactive to IndexedDB via createMonthData().
	import { onMount } from 'svelte';
	import { gsap, EASES } from '$lib/animations/gsap';
	import { motionReduced } from '$lib/state/settings.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { activeMonth } from '$lib/state/month.svelte';
	import { createMonthData } from '$lib/state/monthData.svelte';
	import { formatCurrency } from '$lib/format/currency';
	import { Avatar } from '$lib/components/ui/avatar';
	import * as Card from '$lib/components/ui/card';
	import BalanceCard from '$lib/components/BalanceCard.svelte';
	import MoneySummaryCard from '$lib/components/MoneySummaryCard.svelte';
	import MonthNavigator from '$lib/components/MonthNavigator.svelte';
	import PieChart, { type PieSlice } from '$lib/components/PieChart.svelte';
	import TransactionRow from '$lib/components/TransactionRow.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import TransactionDetail from '$lib/components/TransactionDetail.svelte';
	import Icon from '$lib/components/Icon.svelte';
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
			settings.value.startingBalanceTiền mặt +
			settings.value.startingBalanceNgân hàng +
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
			settings.value.startingBalanceTiền mặt +
			settings.value.startingBalanceNgân hàng +
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
			label: g.cat?.name ?? 'Chưa phân loại',
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

<div class="dash flex flex-col gap-5" bind:this={pageEl}>
	<header class="reveal flex items-center justify-between gap-3 pt-1">
		<div class="min-w-0">
			<p class="micro-label">TỔNG QUAN</p>
			<h1 class="mt-0.5 truncate text-[20px] font-bold tracking-tight text-foreground">
				Xin chào, {settings.value.userName}
			</h1>
		</div>
		<Avatar
			name={settings.value.userName}
			size={42}
			class="border border-border shadow-[var(--shadow-sm)]"
		/>
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

	<div class="reveal grid grid-cols-2 gap-3">
		<div
			class="flex items-center gap-2.5 rounded-[14px] border border-border bg-card px-3.5 py-3 shadow-[var(--shadow-sm)]"
		>
			<span class="size-2 shrink-0 rounded-full" style="background: var(--green)"></span>
			<span class="micro-label">Tiền mặt</span>
			<span class="t-num ml-auto text-[13.5px] font-bold text-foreground">
				{formatCurrency(data.balanceTiền mặt, settings.value.defaultCurrency)}
			</span>
		</div>
		<div
			class="flex items-center gap-2.5 rounded-[14px] border border-border bg-card px-3.5 py-3 shadow-[var(--shadow-sm)]"
		>
			<span class="size-2 shrink-0 rounded-full" style="background: var(--blue)"></span>
			<span class="micro-label">Ngân hàng</span>
			<span class="t-num ml-auto text-[13.5px] font-bold text-foreground">
				{formatCurrency(data.balanceNgân hàng, settings.value.defaultCurrency)}
			</span>
		</div>
	</div>

	<div class="reveal flex justify-center py-0.5">
		<MonthNavigator />
	</div>

	<div class="summary-row reveal grid grid-cols-2 gap-3">
		<MoneySummaryCard
			title="Tổng thu"
			value={data.monthIn}
			currency={settings.value.defaultCurrency}
			kind="in"
			highlight={[4, 5]}
			href="/money/in"
		/>
		<MoneySummaryCard
			title="Tổng chi"
			value={data.monthSpent}
			currency={settings.value.defaultCurrency}
			kind="spent"
			highlight={[3, 5]}
			href="/money/spent"
		/>
	</div>

	<Card.Root class="reveal p-5">
		<div class="mb-4 flex items-center justify-between gap-2">
			<p class="micro-label">CHI TIÊU THEO DANH MỤC</p>
			<SegmentedControl
				options={[
					{ value: 'expense', label: 'Chi tiêu' },
					{ value: 'income', label: 'Thu nhập' }
				]}
				value={pieMode}
				onchange={(v) => (pieMode = v as 'income' | 'expense')}
				size="sm"
			/>
		</div>
		{#if pieSlices.length === 0}
			<p class="rounded-[14px] bg-muted px-4 py-6 text-center text-[13px] text-muted-foreground">
				Tháng này chưa có giao dịch {pieMode === 'income' ? 'thu nhập' : 'chi tiêu'}.
			</p>
		{:else}
			<div class="flex items-center gap-4">
				<div class="shrink-0">
					<PieChart
						slices={pieSlices}
						size={160}
						centerValue={Math.round(
							pieMode === 'income' ? data.monthIn : data.monthSpent
						).toLocaleString('en-US')}
						centerLabel={pieMode === 'income' ? 'Thu' : 'Đã chi'}
					/>
				</div>
				<ul class="min-w-0 flex-1 space-y-2.5">
					{#each pieSlices.slice(0, 6) as s (s.id)}
						<li class="flex items-center gap-2.5 text-[13px]">
							<span class="size-2.5 shrink-0 rounded-full" style="background: {s.color}"></span>
							<span class="min-w-0 flex-1 truncate font-medium tracking-tight text-foreground"
								>{s.label}</span
							>
							<span class="t-num text-[12.5px] font-bold text-muted-foreground">
								{Math.round((s.value / (pieSlices.reduce((a, b) => a + b.value, 0) || 1)) * 100)}%
							</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</Card.Root>

	<Card.Root class="reveal p-5">
		<div class="mb-1 flex items-center justify-between gap-2">
			<p class="micro-label">GIAO DỊCH GẦN ĐÂY</p>
			<a
				href="/money/spent"
				class="inline-flex items-center gap-1 text-[12.5px] font-semibold tracking-tight text-muted-foreground transition-colors hover:text-foreground"
			>
				Xem tất cả
				<Icon name="arrow-right" size={14} strokeWidth={2.5} />
			</a>
		</div>
		{#if recent.length === 0}
			<p
				class="mt-3 rounded-[14px] border border-dashed border-border px-4 py-6 text-center text-[13px] leading-relaxed text-muted-foreground"
			>
				Tháng này chưa có giao dịch. Nhấn nút
				<strong class="font-semibold text-foreground">Add</strong> để ghi giao dịch.
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
	</Card.Root>
</div>

<TransactionDetail
	tx={selectedTx}
	category={selectedTx ? data.catsById.get(selectedTx.categoryId) : undefined}
	currency={settings.value.defaultCurrency}
	onClose={() => (selectedTx = null)}
/>
