<script lang="ts">
	// BalanceCard: the headline card on the dashboard. Shows the total balance
	// via SlotNumber, period change chips, a period selector (7D/30D/90D/1Y) and
	// a combined thin-bars + line trend chart.
	import { onMount } from 'svelte';
	import { gsap, EASES } from '$lib/animations/gsap';
	import { motionReduced } from '$lib/state/settings.svelte';
	import SlotNumber from './SlotNumber.svelte';
	import Icon from './Icon.svelte';

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
		return trend
			.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i, n).toFixed(1)} ${y(p.value).toFixed(1)}`)
			.join(' ');
	});
	const areaD = $derived(
		trend.length
			? `${lineD} L ${x(trend.length - 1, trend.length)} ${H} L ${x(0, trend.length)} ${H} Z`
			: ''
	);

	$effect(() => {
		lineD;
		if (!linePath || motionReduced()) return;
		const len = linePath.getTotalLength();
		gsap.fromTo(
			linePath,
			{ strokeDasharray: len, strokeDashoffset: len },
			{ strokeDashoffset: 0, duration: 1.1, ease: EASES.out }
		);
	});

	onMount(() => {});
</script>

<div class="card p-5">
	<div class="flex items-center justify-between gap-2">
		<span class="micro-label inline-flex items-center gap-1.5">
			<span class="inline-block size-1.5 rounded-full bg-violet"></span>
			Total Balance
		</span>
		<div class="relative">
			<button
				class="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[12px] font-bold tracking-tight text-secondary-foreground"
				onclick={() => (open = !open)}
				aria-haspopup="true"
				aria-expanded={open}
			>
				{period}
				<Icon name="chevron-down" size={12} strokeWidth={3} />
			</button>
			{#if open}
				<div
					class="absolute top-[calc(100%+6px)] right-0 z-10 flex min-w-[92px] animate-pop-in flex-col rounded-[14px] border border-border bg-card p-1 shadow-[var(--shadow-md)]"
					role="menu"
				>
					{#each periods as p (p)}
						<button
							class="rounded-[10px] px-3.5 py-2 text-left text-[13px] font-semibold tracking-tight text-foreground {p ===
							period
								? 'bg-muted'
								: ''}"
							onclick={() => {
								onPeriodChange(p);
								open = false;
							}}
							role="menuitem">{p}</button
						>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="t-num mt-4 text-[38px] leading-none font-bold tracking-[-0.03em] text-foreground">
		<SlotNumber value={balance} {currency} duration={1.6} stagger={0.07} />
	</div>

	<div class="mt-3.5 flex items-center gap-2">
		<span
			class="t-num inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--success)_14%,var(--card))] px-2.5 py-1 text-[11px] font-bold text-success"
		>
			<Icon name="arrow-up-right" size={11} strokeWidth={3} />
			{changeUp > 0 ? '+' : ''}{changeUp.toFixed(1)}%
		</span>
		<span
			class="t-num inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground"
		>
			<Icon name="arrow-down-right" size={11} strokeWidth={3} />
			{changeDown > 0 ? '-' : ''}{changeDown.toFixed(1)}%
		</span>
	</div>

	<div class="mt-4 w-full">
		<svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H}>
			<defs>
				<linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="var(--violet)" stop-opacity="0.2"></stop>
					<stop offset="100%" stop-color="var(--violet)" stop-opacity="0"></stop>
				</linearGradient>
			</defs>
			{#each trend as p, i (i)}
				<rect
					x={x(i, trend.length) - 3}
					y={y(p.value)}
					width="6"
					height={H - y(p.value)}
					rx="2"
					fill="var(--muted)"
				></rect>
			{/each}
			<path d={areaD} fill="url(#trendArea)"></path>
			<path
				bind:this={linePath}
				d={lineD}
				fill="none"
				stroke="var(--violet)"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			></path>
		</svg>
	</div>
</div>
