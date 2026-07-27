<script lang="ts">
	// PieChart: custom SVG donut chart. Slices draw in via GSAP (stroke-dashoffset
	// animating to 0). Tap a slice to highlight it and show its label/value.
	import { onDestroy } from 'svelte';
	import { gsap, EASES } from '$lib/animations/gsap';
	import { motionReduced } from '$lib/state/settings.svelte';

	export interface PieSlice {
		id: number | string;
		label: string;
		value: number;
		color: string;
	}
	interface Props {
		slices: PieSlice[];
		size?: number;
		thickness?: number;
		centerLabel?: string;
		centerValue?: string;
	}
	let { slices, size = 200, thickness = 18, centerLabel, centerValue }: Props = $props();

	const R = 42;
	const C = 2 * Math.PI * R; // circumference in svg units (viewBox 100)
	const GAP = 0.6; // gap between slices (svg units of arc length)

	const total = $derived(slices.reduce((s, x) => s + x.value, 0));
	// Pre-compute segment geometry.
	const segs = $derived.by(() => {
		if (total <= 0) return [];
		let acc = 0;
		return slices.map((s) => {
			const frac = s.value / total;
			const arcLen = Math.max(0, frac * C - GAP);
			const startAngle = (acc / total) * 360;
			acc += s.value;
			return { ...s, frac, arcLen, startAngle, rest: C - arcLen };
		});
	});

	let selectedId = $state<number | string | null>(null);
	let ringEls: SVGCircleElement[] = $state([]);

	$effect(() => {
		slices;
		// (Re)animate draw-in whenever slices change.
		if (motionReduced()) return;
		const id = requestAnimationFrame(() => {
			ringEls.forEach((el, i) => {
				if (!el || segs[i] === undefined) return;
				gsap.fromTo(
					el,
					{ strokeDashoffset: segs[i].arcLen },
					{
						strokeDashoffset: 0,
						duration: 0.8,
						ease: EASES.out,
						delay: i * 0.08
					}
				);
			});
		});
		return () => cancelAnimationFrame(id);
	});

	onDestroy(() => gsap.killTweensOf(ringEls));

	function selectSlice(id: number | string) {
		selectedId = selectedId === id ? null : id;
	}
</script>

<div class="pie-wrap">
	<svg viewBox="-8 -8 116 116" width={size} height={size} class="pie-svg" role="img">
		<g transform="rotate(-90 50 50)">
			<circle
				cx="50"
				cy="50"
				r={R}
				fill="none"
				stroke="var(--surface-2)"
				stroke-width={thickness}
			/>
			{#each segs as seg, i (seg.id)}
				<circle
					bind:this={ringEls[i]}
					cx="50"
					cy="50"
					r={R}
					fill="none"
					stroke={seg.color}
					stroke-width={selectedId === seg.id ? thickness + 3 : thickness}
					stroke-dasharray="{seg.arcLen} {seg.rest}"
					stroke-dashoffset="0"
					transform="rotate({seg.startAngle} 50 50)"
					class="seg {selectedId === seg.id ? 'sel' : ''}"
					role="button"
					tabindex="0"
					aria-label="{seg.label}: {seg.value}"
					onclick={() => selectSlice(seg.id)}
					onkeydown={(e) => e.key === 'Enter' && selectSlice(seg.id)}
					style="cursor: pointer; transition: stroke-width 0.2s ease;"
				/>
			{/each}
		</g>
		{#if centerValue || centerLabel}
			<text x="50" y="48" text-anchor="middle" class="ct-v">{centerValue ?? ''}</text>
			<text x="50" y="62" text-anchor="middle" class="ct-l">{centerLabel ?? ''}</text>
		{/if}
	</svg>

	{#if selectedId !== null}
		{@const sel = segs.find((s) => s.id === selectedId)}
		{#if sel}
			<div class="sel-info" style="--c: {sel.color}">
				<span class="sel-label">{sel.label}</span>
				<span class="sel-val">{Math.round(sel.frac * 100)}%</span>
			</div>
		{/if}
	{/if}
</div>

<style>
	.pie-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}
	.pie-svg .seg {
		outline: none;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}
	.pie-svg .seg:focus,
	.pie-svg .seg:focus-visible {
		outline: none;
	}
	.pie-svg .seg.sel {
		filter: drop-shadow(0 0 6px var(--c, rgba(0, 0, 0, 0.2)));
	}
	.ct-v {
		font-size: 11px;
		font-weight: 800;
		fill: var(--text);
	}
	.ct-l {
		font-size: 6px;
		fill: var(--text-3);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.sel-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}
	.sel-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
	}
	.sel-val {
		font-size: 18px;
		font-weight: 800;
		color: var(--c);
	}
</style>
