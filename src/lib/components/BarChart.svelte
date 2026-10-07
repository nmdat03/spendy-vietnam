<script lang="ts">
	// BarChart: vertical bar chart for monthly breakdowns. The active month is a
	// solid accent bar (violet by default via `color`); other months are muted.
	// Bars rise in with a GSAP stagger; hovering a column reveals its value.
	import { onDestroy } from 'svelte';
	import { gsap, EASES } from '$lib/animations/gsap';
	import { motionReduced } from '$lib/state/settings.svelte';

	interface Bar {
		label: string;
		value: number;
		active?: boolean;
	}
	interface Props {
		bars: Bar[];
		height?: number;
		color?: string; // active bar color
	}
	let { bars, height = 180, color = 'var(--green)' }: Props = $props();

	const max = $derived(Math.max(1, ...bars.map((b) => b.value)));
	let barEls: HTMLElement[] = $state([]);
	let hoverIdx = $state<number | null>(null);

	const compact = new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1
	});

	function pct(b: Bar): number {
		return Math.max(2, (b.value / max) * 100);
	}

	$effect(() => {
		bars;
		if (motionReduced()) return;
		const id = requestAnimationFrame(() => {
			barEls.forEach((el, i) => {
				if (!el) return;
				gsap.fromTo(
					el,
					{ scaleY: 0, transformOrigin: 'bottom' },
					{ scaleY: 1, duration: 0.6, ease: EASES.out, delay: i * 0.05 }
				);
			});
		});
		return () => cancelAnimationFrame(id);
	});

	onDestroy(() => gsap.killTweensOf(barEls));
</script>

<div class="bars" style="height: {height}px">
	{#each bars as b, i (i)}
		<div
			class="col"
			role="presentation"
			onmouseenter={() => (hoverIdx = i)}
			onmouseleave={() => (hoverIdx = null)}
		>
			<div class="bar-track">
				{#if b.active || hoverIdx === i}
					<span class="val t-num" style="bottom: calc({pct(b)}% + 8px)">
						{compact.format(b.value)}
					</span>
				{/if}
				<div
					class="bar"
					class:active={b.active}
					bind:this={barEls[i]}
					style="height: {pct(b)}%; --bar-color: {color}"
					aria-label="{b.label}: {b.value}"
				></div>
			</div>
			<span class="lbl micro-label" class:active={b.active}>{b.label}</span>
		</div>
	{/each}
</div>

<style>
	.bars {
		display: flex;
		align-items: flex-end;
		width: 100%;
	}
	.col {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		height: 100%;
		padding: 0 5px;
	}
	.bar-track {
		position: relative;
		flex: 1;
		width: 100%;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		border-bottom: 1px solid var(--border);
	}
	.bar {
		width: 62%;
		max-width: 42px;
		border-radius: 7px 7px 2px 2px;
		background: color-mix(in oklab, var(--muted) 62%, transparent);
		will-change: transform;
		transition:
			height 0.5s cubic-bezier(0.22, 1, 0.36, 1),
			background 0.25s ease,
			box-shadow 0.25s ease;
	}
	.bar.active {
		background: linear-gradient(
			180deg,
			color-mix(in oklab, var(--bar-color) 78%, #fff) 0%,
			var(--bar-color) 100%
		);
		box-shadow: 0 6px 16px color-mix(in oklab, var(--bar-color) 30%, transparent);
	}
	.col:hover .bar:not(.active) {
		background: color-mix(in oklab, var(--muted-foreground) 26%, transparent);
	}
	.val {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		z-index: 1;
		padding: 3px 8px;
		border-radius: 999px;
		background: var(--foreground);
		color: var(--background);
		font-size: 11px;
		font-weight: 700;
		white-space: nowrap;
		pointer-events: none;
	}
	.lbl {
		color: var(--muted-foreground);
	}
	.lbl.active {
		color: var(--foreground);
	}
</style>
