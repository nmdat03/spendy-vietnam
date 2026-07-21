<script lang="ts">
	// SegmentedControl: pill-style 2-option switch (e.g. Pemasukan/Pengeluaran,
	// Money in/Money spent). Active option morphs to a dark pill.
	import { onMount } from 'svelte';
	import { gsap, EASES, prefersReducedMotion } from '$lib/animations/gsap';

	interface Option<T extends string> {
		value: T;
		label: string;
	}
	interface Props<T extends string> {
		options: Option<T>[];
		value: T;
		onchange: (v: T) => void;
		size?: 'sm' | 'md';
	}
	let { options, value, onchange, size = 'md' }: Props<string> = $props();

	let thumb = $state<HTMLDivElement | null>(null);
	const reduced = prefersReducedMotion();

	$effect(() => {
		value;
		const target = document.querySelector<HTMLElement>(`[data-seg="${value}"]`);
		if (!target || !thumb) return;
		if (reduced) {
			gsap.set(thumb, { left: target.offsetLeft, width: target.offsetWidth });
			return;
		}
		gsap.to(thumb, {
			left: target.offsetLeft,
			width: target.offsetWidth,
			duration: 0.34,
			ease: EASES.outBack
		});
	});
	onMount(() => {
		const target = document.querySelector<HTMLElement>(`[data-seg="${value}"]`);
		if (target && thumb) gsap.set(thumb, { left: target.offsetLeft, width: target.offsetWidth });
	});
</script>

<div class="seg {size}" role="tablist">
	<div class="seg-thumb" bind:this={thumb} aria-hidden="true"></div>
	{#each options as opt (opt.value)}
		<button
			class="seg-item"
			data-seg={opt.value}
			class:active={value === opt.value}
			role="tab"
			aria-selected={value === opt.value}
			onclick={() => onchange(opt.value)}
		>
			{opt.label}
		</button>
	{/each}
</div>

<style>
	.seg {
		position: relative;
		display: inline-flex;
		align-items: center;
		background: var(--surface-2);
		border-radius: 999px;
		padding: 4px;
		gap: 4px;
	}
	.sm {
		padding: 3px;
	}
	.seg-thumb {
		position: absolute;
		top: 4px;
		height: calc(100% - 8px);
		background: #0b0f17;
		border-radius: 999px;
		z-index: 0;
		pointer-events: none;
	}
	.seg-item {
		position: relative;
		z-index: 1;
		border: none;
		background: transparent;
		color: var(--text-2);
		font-weight: 600;
		border-radius: 999px;
		transition: color 0.25s ease;
		white-space: nowrap;
	}
	.md .seg-item {
		padding: 9px 18px;
		font-size: 14px;
	}
	.sm .seg-item {
		padding: 7px 14px;
		font-size: 13px;
	}
	.seg-item.active {
		color: #fff;
	}
</style>