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
	const color = $derived(kind === 'in' ? 'var(--green)' : 'var(--red)');
	const arrow = $derived(kind === 'in' ? 'arrow-up-right' : 'arrow-down-right');
</script>

<a class="card summary" href={href ?? '#'} aria-label={title}>
	<div class="top">
		<span class="ttl">{title}</span>
		<span class="arrow" style="--c: {color}"><Icon name={arrow} size={16} /></span>
	</div>
	<div class="val" style="color: {color}">{formatCurrency(value, currency)}</div>
	<div class="spark">
		{#each bars as b, i (i)}
			<span
				class="spk-bar"
				class:hi={highlight.includes(i)}
				style="height: {(b / maxBar) * 100}%; --c: {color}"
			></span>
		{/each}
	</div>
</a>

<style>
	.summary {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 14px 14px 12px;
		flex: 1;
		min-width: 0;
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.ttl {
		font-size: 12px;
		color: var(--text-2);
		font-weight: 600;
	}
	.arrow {
		display: inline-flex;
		color: var(--c);
	}
	.val {
		font-size: 19px;
		font-weight: 800;
		letter-spacing: -0.01em;
		font-variant-numeric: tabular-nums;
	}
	.spark {
		display: flex;
		align-items: flex-end;
		gap: 3px;
		height: 28px;
		margin-top: 4px;
	}
	.spk-bar {
		flex: 1;
		background: var(--border);
		border-radius: 3px;
		opacity: 0.7;
	}
	.spk-bar.hi {
		background: var(--c);
		opacity: 1;
	}
</style>
