<script lang="ts">
	// BarChart: vertical bar chart for monthly breakdowns. The "active" bar gets
	// a colored gradient; inactive bars use a hatch/transparent pattern.
	// Bars rise in with a GSAP stagger.
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
		<div class="col">
			<div class="bar-track">
				<div
					class="bar {b.active ? 'active' : 'inactive'}"
					bind:this={barEls[i]}
					style="height: {Math.max(2, (b.value / max) * 100)}%; --bar-color: {color}"
					aria-label="{b.label}: {b.value}"
				></div>
			</div>
			<span class="lbl" class:active={b.active}>{b.label}</span>
		</div>
	{/each}
</div>

<style>
	.bars {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		width: 100%;
	}
	.col {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		height: 100%;
	}
	.bar-track {
		flex: 1;
		width: 100%;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}
	.bar {
		width: 70%;
		border-radius: 8px 8px 4px 4px;
		background: var(--bar-color);
		will-change: transform;
	}
	.bar.inactive {
		background: repeating-linear-gradient(
			45deg,
			var(--border),
			var(--border) 3px,
			transparent 3px,
			transparent 7px
		);
		opacity: 0.7;
	}
	.lbl {
		font-size: 11px;
		color: var(--text-3);
		font-weight: 600;
	}
	.lbl.active {
		color: var(--text);
	}
</style>
