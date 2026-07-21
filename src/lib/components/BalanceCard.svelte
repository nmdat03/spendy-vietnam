<script lang="ts">
	// BalanceCard: the headline card on the dashboard. Shows the total balance
	// via SlotNumber, period change chips, a period selector (7D/30D/90D/1Y) and
	// a combined thin-bars + line trend chart.
	import { onMount } from 'svelte';
	import { gsap, EASES, prefersReducedMotion } from '$lib/animations/gsap';
	import SlotNumber from './SlotNumber.svelte';

	interface TrendPoint {
		label: string;
		value: number;
	}
	interface Props {
		balance: number;
		currency: string;
		period: string;
		periods: string[];
		onPeriodChange: (p: string) => void;
		trend: TrendPoint[];
		changeUp?: number;
		changeDown?: number;
	}
	let {
		balance,
		currency,
		period,
		periods,
		onPeriodChange,
		trend,
		changeUp = 0,
		changeDown = 0
	}: Props = $props();

	const reduced = prefersReducedMotion();
	let open = $state(false);
	let linePath = $state<SVGPathElement | null>(null);

	// Build SVG trend: thin bars + a polyline area.
	const W = 300;
	const H = 80;
	const max = $derived(Math.max(1, ...trend.map((p) => p.value)));
	const min = $derived(Math.min(0, ...trend.map((p) => p.value)));
	const range = $derived(max - min || 1);

	function x(i: number, n: number): number {
		return n <= 1 ? W / 2 : (i / (n - 1)) * W;
	}
	function y(v: number): number {
		return H - ((v - min) / range) * H;
	}
	const lineD = $derived.by(() => {
		const n = trend.length;
		if (n === 0) return '';
		return trend.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i, n).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
	});
	const areaD = $derived(
		trend.length ? `${lineD} L ${x(trend.length - 1, trend.length)} ${H} L ${x(0, trend.length)} ${H} Z` : ''
	);

	$effect(() => {
		lineD;
		if (!linePath || reduced) return;
		const len = linePath.getTotalLength();
		gsap.fromTo(
			linePath,
			{ strokeDasharray: len, strokeDashoffset: len },
			{ strokeDashoffset: 0, duration: 1.1, ease: EASES.out }
		);
	});

	onMount(() => {});
</script>

<div class="card balance">
	<div class="head">
		<span class="label">Total Balance</span>
		<div class="period">
			<button class="period-btn" onclick={() => (open = !open)} aria-haspopup="true" aria-expanded={open}>
				{period}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
			</button>
			{#if open}
				<div class="period-menu" role="menu">
					{#each periods as p (p)}
						<button class:sel={p === period} onclick={() => { onPeriodChange(p); open = false; }} role="menuitem">{p}</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="amount">
		<SlotNumber value={balance} {currency} duration={1.6} stagger={0.07} />
	</div>

	<div class="chips">
		<span class="chip up">
			<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
			{changeUp > 0 ? '+' : ''}{changeUp.toFixed(1)}%
		</span>
		<span class="chip down">
			<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="7" x2="17" y2="17"></line><polyline points="17 7 17 17 7 17"></polyline></svg>
			{changeDown > 0 ? '-' : ''}{changeDown.toFixed(1)}%
		</span>
	</div>

	<div class="chart">
		<svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H}>
			<defs>
				<linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="var(--blue)" stop-opacity="0.22"></stop>
					<stop offset="100%" stop-color="var(--blue)" stop-opacity="0"></stop>
				</linearGradient>
			</defs>
			{#each trend as p, i (i)}
				<rect x={x(i, trend.length) - 3} y={y(p.value)} width="6" height={H - y(p.value)} rx="2" fill="var(--surface-2)"></rect>
			{/each}
			<path d={areaD} fill="url(#trendArea)"></path>
			<path bind:this={linePath} d={lineD} fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
		</svg>
	</div>
</div>

<style>
	.balance {
		padding: 20px 22px 18px;
		background: linear-gradient(180deg, var(--surface), var(--surface) 60%, color-mix(in srgb, var(--blue) 4%, var(--surface)));
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.label {
		font-size: 13px;
		color: var(--text-2);
		font-weight: 600;
	}
	.period {
		position: relative;
	}
	.period-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 6px 12px;
		border-radius: 999px;
		background: var(--surface-2);
		font-size: 12px;
		font-weight: 700;
		color: var(--text);
	}
	.period-menu {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		background: var(--surface);
		border-radius: 12px;
		box-shadow: var(--shadow-md);
		padding: 4px;
		display: flex;
		flex-direction: column;
		z-index: 5;
	}
	.period-menu button {
		padding: 8px 14px;
		font-size: 13px;
		font-weight: 600;
		border-radius: 8px;
		text-align: left;
		color: var(--text);
	}
	.period-menu button.sel {
		background: var(--surface-2);
	}
	.amount {
		font-size: 34px;
		font-weight: 800;
		margin: 8px 0 10px;
		letter-spacing: -0.02em;
	}
	.chips {
		display: flex;
		gap: 8px;
		margin-bottom: 14px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 700;
	}
	.chip.up {
		background: color-mix(in srgb, var(--green) 14%, var(--surface));
		color: var(--green);
	}
	.chip.down {
		background: color-mix(in srgb, var(--red) 14%, var(--surface));
		color: var(--red);
	}
	.chart {
		width: 100%;
	}
</style>