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
		tx ? new Date(tx.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : ''
	);
</script>

{#if tx}
	<BottomSheet open={true} title="Detail Transaksi" {onClose}>
		<div class="detail">
			<div class="amt-section">
				<span class="amt-icon" style="--c: {category?.color ?? '#6b7280'}">
					<Icon
						name={category?.icon ?? 'circle-ellipsis'}
						size={22}
						color={category?.color ?? '#6b7280'}
					/>
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
		gap: 14px;
		padding: 10px 0 4px;
	}
	.amt-icon {
		width: 56px;
		height: 56px;
		border-radius: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--c) 13%, var(--card));
	}
	.amt {
		font-size: 32px;
		font-weight: 800;
		letter-spacing: -0.03em;
		font-variant-numeric: tabular-nums;
	}
	.amt.income {
		color: var(--success);
	}
	.amt.expense {
		color: var(--foreground);
	}
	.info-grid {
		display: flex;
		flex-direction: column;
		gap: 0;
		background: var(--muted);
		border-radius: 16px;
		padding: 2px 16px;
	}
	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		padding: 13px 0;
		border-bottom: 1px solid var(--border);
	}
	.info-row:last-child {
		border-bottom: none;
	}
	.i-label {
		font-size: 13px;
		color: var(--muted-foreground);
		font-weight: 550;
	}
	.i-val {
		font-size: 14px;
		font-weight: 600;
		color: var(--foreground);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.del-btn {
		width: 100%;
		height: 50px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--destructive) 10%, var(--card));
		color: var(--destructive);
		font-weight: 650;
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
		color: var(--muted-foreground);
	}
	.confirm-actions {
		display: flex;
		gap: 10px;
	}
	.cancel-btn {
		flex: 1;
		height: 46px;
		border-radius: 999px;
		background: var(--muted);
		color: var(--foreground);
		font-weight: 600;
		font-size: 14px;
	}
	.confirm-del {
		flex: 1;
		height: 46px;
		border-radius: 999px;
		background: var(--destructive);
		color: var(--destructive-foreground);
		font-weight: 650;
		font-size: 14px;
	}
</style>
