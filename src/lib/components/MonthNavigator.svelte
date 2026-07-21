<script lang="ts">
	// MonthNavigator: white pill in the middle flanked by prev/next round buttons.
	// Slides horizontally when the month changes.
	import { onMount } from 'svelte';
	import { gsap, prefersReducedMotion } from '$lib/animations/gsap';
	import { activeMonth, monthLabel } from '$lib/state/month.svelte';
	import Icon from './Icon.svelte';

	let labelEl = $state<HTMLSpanElement | null>(null);
	const reduced = prefersReducedMotion();
	let lastDir = $state<number>(0);

	$effect(() => {
		activeMonth.value;
		if (!labelEl || reduced) return;
		const dir = lastDir || 0;
		gsap.fromTo(
			labelEl,
			{ x: dir * 24, opacity: 0 },
			{ x: 0, opacity: 1, duration: 0.32, ease: 'power3.out', clearProps: 'x,opacity' }
		);
	});

	function prev() {
		lastDir = -1;
		activeMonth.prev();
	}
	function next() {
		lastDir = 1;
		activeMonth.next();
	}

	onMount(() => {});
</script>

<div class="month-nav" aria-label="Navigasi bulan">
	<button class="btn" onclick={prev} aria-label="Bulan sebelumnya"><Icon name="chevron-left" size={18} /></button>
	<span class="pill" bind:this={labelEl}>{monthLabel(activeMonth.value)}</span>
	<button class="btn" onclick={next} aria-label="Bulan berikutnya" disabled={activeMonth.isCurrent()}><Icon name="chevron-right" size={18} /></button>
</div>

<style>
	.month-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}
	.btn {
		width: 34px;
		height: 34px;
		border-radius: 999px;
		background: var(--surface);
		box-shadow: var(--shadow-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text);
	}
	.btn:disabled {
		opacity: 0.35;
	}
	.pill {
		background: var(--surface);
		box-shadow: var(--shadow-sm);
		border-radius: 999px;
		padding: 8px 18px;
		font-size: 14px;
		font-weight: 700;
		min-width: 150px;
		text-align: center;
	}
</style>