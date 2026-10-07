<script lang="ts">
	// AmountKeypad: Revolut-style numeric pad — big tabular amount display on
	// top, flat roomy keys below with a clear press feedback (bg flash + GSAP
	// pop). API is FROZEN (value / currency / allowDecimal / onchange): this
	// component is also used by onboarding and the money pages.
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
	<div class="display" aria-live="polite">
		<span class="sym t-num">{currencySymbol(currency)}</span>
		<span class="amt t-num" class:placeholder={!display}>{display || '0'}</span>
	</div>

	<div class="grid">
		{#each keys as k (k)}
			<button class="key touch" onclick={(e) => press(k, e)} aria-label={k}>{k}</button>
		{/each}
		{#if allowDecimal}
			<button class="key" onclick={(e) => press('.', e)} aria-label="desimal">.</button>
		{:else}
			<button class="key aux touch" onclick={(e) => clearAll(e)} aria-label="Bersihkan">C</button>
		{/if}
		<button class="key touch" onclick={(e) => press('0', e)} aria-label="0">0</button>
		<button class="key aux touch" onclick={(e) => backspace(e)} aria-label="Hapus">
			<svg
				width="24"
				height="24"
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
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.display {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 8px;
		min-height: 78px;
		padding: 12px 0 4px;
	}
	.sym {
		font-size: 20px;
		font-weight: 650;
		color: var(--muted-foreground);
		letter-spacing: -0.01em;
	}
	.amt {
		font-size: clamp(42px, 12.5vw, 54px);
		font-weight: 700;
		color: var(--foreground);
	}
	.amt.placeholder {
		color: var(--text-3);
		opacity: 0.45;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px 8px;
	}
	.key {
		height: 62px;
		border-radius: 18px;
		font-size: 25px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--foreground);
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		-webkit-tap-highlight-color: transparent;
		transition: background 0.12s ease;
	}
	.key:hover {
		background: color-mix(in srgb, var(--muted) 65%, transparent);
	}
	.key:active {
		background: var(--muted);
	}
	.key:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: -2px;
	}
	.key.aux {
		color: var(--violet);
	}
	.key.aux:hover {
		background: color-mix(in srgb, var(--violet) 9%, transparent);
	}
	.key.aux:active {
		background: color-mix(in srgb, var(--violet) 15%, transparent);
	}
</style>
