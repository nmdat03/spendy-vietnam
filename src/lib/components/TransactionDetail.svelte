<script lang="ts">
	// TransactionDetail: bottom sheet showing a transaction's info with a
	// delete button (with confirmation). Tapping a TransactionRow opens this.
	import { deleteTransaction } from '$lib/db';
	import { formatCurrency } from '$lib/format/currency';
	import Icon from './Icon.svelte';
	import BottomSheet from './BottomSheet.svelte';
	import type { Transaction, Category } from '$lib/db/schema';

	interface Props {
		tx: Transaction | null;
		category: Category | undefined;
		currency: string;
		onClose: () => void;
	}
	let { tx, category, currency, onClose }: Props = $props();

	let confirming = $state(false);

	async function doDelete() {
		if (!tx?.id) return;
		await deleteTransaction(tx.id);
		confirming = false;
		onClose();
	}

	const dateLabel = $derived(
		tx
			? new Date(tx.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
			: ''
	);
</script>

{#if tx}
	<BottomSheet open={true} title="Detail Transaksi" onClose={onClose}>
		<div class="detail">
			<div class="amt-section">
				<span class="amt-icon" style="--c: {category?.color ?? '#6b7280'}">
					<Icon name={category?.icon ?? 'circle-ellipsis'} size={22} color={category?.color ?? '#6b7280'} />
				</span>
				<span class="amt" class:income={tx.type === 'income'} class:expense={tx.type === 'expense'}>
					{tx.type === 'income' ? '+' : '−'}{formatCurrency(Math.abs(tx.amount), currency)}
				</span>
			</div>

			<div class="info-grid">
				<div class="info-row">
					<span class="i-label">Kategori</span>
					<span class="i-val">{category?.name ?? 'Uncategorized'}</span>
				</div>
				<div class="info-row">
					<span class="i-label">Jenis</span>
					<span class="i-val">{tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span>
				</div>
				<div class="info-row">
					<span class="i-label">Akun</span>
					<span class="i-val">{(tx.account ?? 'cash') === 'cash' ? 'Cash' : 'Debit'}</span>
				</div>
				<div class="info-row">
					<span class="i-label">Tanggal</span>
					<span class="i-val">{dateLabel}</span>
				</div>
				{#if tx.note}
					<div class="info-row">
						<span class="i-label">Catatan</span>
						<span class="i-val">{tx.note}</span>
					</div>
				{/if}
			</div>

			{#if !confirming}
				<button class="del-btn" onclick={() => (confirming = true)}>
					<Icon name="trash-2" size={16} /> Hapus Transaksi
				</button>
			{:else}
				<div class="confirm-box">
					<p>Yakin ingin menghapus transaksi ini?</p>
					<div class="confirm-actions">
						<button class="cancel-btn" onclick={() => (confirming = false)}>Batal</button>
						<button class="confirm-del" onclick={doDelete}>Ya, Hapus</button>
					</div>
				</div>
			{/if}
		</div>
	</BottomSheet>
{/if}

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding-bottom: 8px;
	}
	.amt-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 12px 0;
	}
	.amt-icon {
		width: 52px;
		height: 52px;
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--c) 14%, var(--surface));
	}
	.amt {
		font-size: 28px;
		font-weight: 800;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}
	.amt.income {
		color: var(--green);
	}
	.amt.expense {
		color: var(--red);
	}
	.info-grid {
		display: flex;
		flex-direction: column;
		gap: 0;
		background: var(--surface-2);
		border-radius: var(--r-md);
		padding: 4px 16px;
	}
	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 0;
		border-bottom: 1px solid var(--border);
	}
	.info-row:last-child {
		border-bottom: none;
	}
	.i-label {
		font-size: 13px;
		color: var(--text-2);
		font-weight: 600;
	}
	.i-val {
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
		text-align: right;
	}
	.del-btn {
		width: 100%;
		height: 48px;
		border-radius: 14px;
		background: color-mix(in srgb, var(--red) 12%, var(--surface));
		color: var(--red);
		font-weight: 700;
		font-size: 15px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}
	.confirm-box {
		text-align: center;
	}
	.confirm-box p {
		margin: 0 0 12px;
		font-size: 14px;
		color: var(--text-2);
	}
	.confirm-actions {
		display: flex;
		gap: 10px;
	}
	.cancel-btn {
		flex: 1;
		height: 44px;
		border-radius: 12px;
		background: var(--surface-2);
		font-weight: 600;
		font-size: 14px;
	}
	.confirm-del {
		flex: 1;
		height: 44px;
		border-radius: 12px;
		background: var(--red);
		color: #fff;
		font-weight: 700;
		font-size: 14px;
	}
</style>