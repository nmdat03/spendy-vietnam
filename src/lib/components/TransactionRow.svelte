<script lang="ts">
	// TransactionRow: list row styled like the reference (icon avatar, name,
	// amount right-aligned, colored by income/expense).
	import { formatCurrency } from '$lib/format/currency';
	import Icon from './Icon.svelte';
	import type { Category, Transaction } from '$lib/db/schema';

	interface Props {
		tx: Transaction;
		category: Category | undefined;
		currency: string;
		onSelect?: (tx: Transaction) => void;
	}
	let { tx, category, currency, onSelect }: Props = $props();

	const amount = $derived(tx.type === 'income' ? tx.amount : -tx.amount);
	const timeLabel = $derived(relativeTime(tx.date));
	const accountLabel = $derived((tx.account ?? 'cash') === 'cash' ? 'Cash' : 'Debit');

	function relativeTime(iso: string): string {
		const d = new Date(iso);
		const now = new Date();
		const diff = (now.getTime() - d.getTime()) / 1000;
		if (diff < 60) return 'baru saja';
		if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h lalu`;
		// More than 24h ago: show the date instead of an ambiguous "Xh lalu".
		return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
	}
</script>

<div
	class="row"
	role="button"
	tabindex="0"
	onclick={() => onSelect?.(tx)}
	onkeydown={(e) => e.key === 'Enter' && onSelect?.(tx)}
>
	<span class="avatar" style="--c: {category?.color ?? '#6b7280'}">
		<Icon
			name={category?.icon ?? 'circle-ellipsis'}
			size={18}
			color={category?.color ?? '#6b7280'}
		/>
	</span>
	<span class="meta">
		<span class="name">{tx.note || category?.name || 'Tanpa nama'}</span>
		<span class="sub"
			>{category?.name ?? 'Uncategorized'} · {timeLabel} ·
			<span class="acc-tag {tx.account ?? 'cash'}">{accountLabel}</span></span
		>
	</span>
	<span class="amount" class:income={tx.type === 'income'} class:expense={tx.type === 'expense'}>
		{tx.type === 'income' ? '+' : '−'}{formatCurrency(Math.abs(tx.amount), currency)}
	</span>
</div>

<style>
	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 2px;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.row:last-child {
		border-bottom: none;
	}
	.avatar {
		width: 42px;
		height: 42px;
		border-radius: 13px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--c) 13%, var(--card));
		flex-shrink: 0;
	}
	.meta {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}
	.name {
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--foreground);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.sub {
		font-size: 12.5px;
		color: var(--text-3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.acc-tag {
		font-weight: 650;
		font-size: 10px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 1.5px 7px;
		border-radius: 999px;
		margin-left: 2px;
	}
	.acc-tag.cash {
		background: color-mix(in srgb, var(--green) 13%, var(--card));
		color: var(--green);
	}
	.acc-tag.debit {
		background: color-mix(in srgb, var(--blue) 13%, var(--card));
		color: var(--blue);
	}
	.amount {
		font-size: 15px;
		font-weight: 650;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.amount.income {
		color: var(--success);
	}
	.amount.expense {
		color: var(--foreground);
	}
</style>
