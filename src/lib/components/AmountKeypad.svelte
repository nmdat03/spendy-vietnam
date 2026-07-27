<script lang="ts">
	// AmountKeypad: large calculator-style keypad for Step 1 of the Add flow.
	// Digits pop in on tap. Live-formats the amount per the active currency.
	import { gsap, EASES } from '$lib/animations/gsap';
	import { motionReduced } from '$lib/state/settings.svelte';
	import { currencySymbol } from '$lib/format/currency';

	interface Props {
		value: string; // raw digit string, may include "."
		currency: string;
		allowDecimal: boolean;
		onchange: (v: string) => void;
	}
	let { value, currency, allowDecimal, onchange }: Props = $props();

	let lastPressed = $state<string>('');

	// Display value formatted with thousand separators.
	const display = $derived(formatDisplay(value));

	function formatDisplay(v: string): string {
		if (!v) return '';
		const [intPart, fracPart] = v.split('.');
		const intNum = Number.parseInt(intPart || '0', 10);
		const grouped = intNum.toLocaleString('en-US');
		if (v.includes('.')) return `${grouped}.${fracPart ?? ''}`;
		return grouped;
	}

	function pop(el: EventTarget | null) {
		if (!el || motionReduced()) return;
		const target = el as HTMLElement;
		gsap.fromTo(
			target,
			{ scale: 0.88 },
			{ scale: 1, duration: 0.4, ease: EASES.outBack, clearProps: 'scale' }
		);
	}

	function press(d: string, e: MouseEvent) {
		pop(e.currentTarget);
		lastPressed = d;
		// Reject leading zeros / multiple decimal points.
		if (d === '.') {
			if (!allowDecimal || value.includes('.')) return;
			onchange(value === '' ? '0.' : value + '.');
			return;
		}
		if (value === '0' && d !== '.') onchange(d);
		else onchange(value + d);
	}

	function backspace(e: MouseEvent) {
		pop(e.currentTarget);
		onchange(value.slice(0, -1));
	}

	function clearAll(e: MouseEvent) {
		pop(e.currentTarget);
		onchange('');
	}

	const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
</script>

<div class="keypad">
	<div class="amount-display">
		<span class="sym">{currencySymbol(currency)}</span>
		<span class="amt">{display || '0'}</span>
	</div>

	<div class="grid">
		{#each keys as k (k)}
			<button class="key" onclick={(e) => press(k, e)} aria-label={k}>{k}</button>
		{/each}
		{#if allowDecimal}
			<button class="key" onclick={(e) => press('.', e)} aria-label="decimal">.</button>
		{:else}
			<button class="key aux" onclick={(e) => clearAll(e)} aria-label="Clear">C</button>
		{/if}
		<button class="key" onclick={(e) => press('0', e)} aria-label="0">0</button>
		<button class="key aux" onclick={(e) => backspace(e)} aria-label="Hapus">
			<svg
				width="22"
				height="22"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M21 4H8L2 12l6 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
				<line x1="18" y1="9" x2="12" y2="15"></line>
				<line x1="12" y1="9" x2="18" y2="15"></line>
			</svg>
		</button>
	</div>
</div>

<style>
	.keypad {
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding-top: 6px;
	}
	.amount-display {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 6px;
		padding: 18px 0;
		min-height: 96px;
	}
	.sym {
		font-size: 22px;
		color: var(--text-2);
		font-weight: 600;
	}
	.amt {
		font-size: 44px;
		font-weight: 800;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}
	.key {
		height: 60px;
		border-radius: 18px;
		background: var(--surface-2);
		font-size: 22px;
		font-weight: 600;
		color: var(--text);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s ease;
	}
	.key:active {
		background: var(--border);
	}
	.key.aux {
		background: transparent;
		color: var(--text-2);
	}
	.key.aux:active {
		background: var(--surface-2);
	}
</style>
