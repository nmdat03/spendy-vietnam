<script lang="ts">
	// MoneySummaryCard: compact card summarising Money In / Money Spent for the
	// active month. Shows the total, an arrow icon, and a mini sparkline where a
	// couple of bars are highlighted with the value's color.
	import { formatCurrency } from '$lib/format/currency';
	import Icon from './Icon.svelte';

	interface Props {
		title: string;
		value: number;
		currency: string;
		kind: 'in' | 'spent';
		highlight?: number[]; // indices to highlight
		href?: string;
	}
	let { title, value, currency, kind, highlight = [], href }: Props = $props();

	const bars = [10, 22, 14, 28, 18, 30, 12, 24];
	const maxBar = Math.max(...bars);
	// Income reads green; spending reads ink — red is reserved for destructive UI.
	const color = $derived(kind === 'in' ? 'var(--success)' : 'var(--foreground)');
	const arrow = $derived(kind === 'in' ? 'arrow-up-right' : 'arrow-down-right');
</script>

<a class="card flex min-w-0 flex-1 flex-col p-5" href={href ?? '#'} aria-label={title}>
	<div class="flex items-center justify-between gap-2">
		<span class="micro-label">{title}</span>
		<span class="inline-flex" style="color: {color}">
			<Icon name={arrow} size={15} strokeWidth={2.25} />
		</span>
	</div>
	<div
		class="t-num mt-2.5 text-[18px] leading-none font-bold tracking-[-0.02em]"
		style="color: {color}"
	>
		{formatCurrency(value, currency)}
	</div>
	<div class="mt-3.5 flex h-6 items-end gap-[3px]">
		{#each bars as b, i (i)}
			<span
				class="spk-bar flex-1 rounded-full"
				class:hi={highlight.includes(i)}
				style="height: {(b / maxBar) * 100}%; --c: {color}"
			></span>
		{/each}
	</div>
</a>

<style>
	.spk-bar {
		min-height: 4px;
		background: var(--border);
		opacity: 0.7;
		transition: opacity 0.2s ease;
	}
	.spk-bar.hi {
		background: var(--c);
		opacity: 1;
	}
</style>
