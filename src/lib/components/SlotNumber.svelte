<script lang="ts">
	// SlotNumber: reveals a numeric value like a slot machine.
	// Each digit is a vertical reel that spins through 0-9 several times before
	// settling on the target digit. Separators, currency symbols and the minus
	// sign stay static — only digits animate. Respects prefers-reduced-motion.
	import { onDestroy } from 'svelte';
	import { gsap, EASES } from '$lib/animations/gsap';
	import { motionReduced } from '$lib/state/settings.svelte';
	import { splitAmount } from '$lib/format/currency';

	interface Props {
		value: number;
		currency: string;
		duration?: number;
		stagger?: number;
		spinDelay?: number;
		class?: string;
	}

	let {
		value,
		currency,
		duration = 1.4,
		stagger = 0.09,
		spinDelay = 0,
		class: klass = ''
	}: Props = $props();

	interface Char {
		ch: string;
		spin: boolean;
	}

	// Split value into display chars (sign + grouped integer + decimal + fraction).
	const parts = $derived(splitAmount(value, currency));
	const chars = $derived.by<Char[]>(() => {
		const list: Char[] = [];
		if (parts.sign) list.push({ ch: parts.sign, spin: false });
		for (const c of parts.integer) {
			list.push({ ch: c, spin: /[0-9]/.test(c) });
		}
		if (parts.fraction) {
			list.push({ ch: '.', spin: false });
			for (const c of parts.fraction) list.push({ ch: c, spin: true });
		}
		return list;
	});

	// Build a reel strip: several cycles of 0-9, then the target digit at a known
	// `stopIndex`, then a couple of buffer cycles AFTER the target. The buffer is
	// important: the `back.out` ease overshoots past the target before settling,
	// and without digits after the target that overshoot would show blank space.
	const CYCLES = 8;
	const BUFFER_CYCLES = 2;
	function stripFor(target: string): { strip: string[]; stopIndex: number } {
		const t = Number.parseInt(target, 10);
		const strip: string[] = [];
		for (let c = 0; c < CYCLES; c++) {
			for (let d = 0; d <= 9; d++) strip.push(String(d));
		}
		const stopIndex = strip.length; // target lands here
		strip.push(String(t));
		// Buffer digits after the target so the overshoot still shows digits.
		for (let c = 0; c < BUFFER_CYCLES; c++) {
			for (let d = 0; d <= 9; d++) strip.push(String(d));
		}
		return { strip, stopIndex };
	}
	const strips = $derived(chars.map((c) => (c.spin ? stripFor(c.ch) : null)));

	let containers: (HTMLElement | null)[] = $state([]);
	let reels: (HTMLElement | null)[] = $state([]);
	let digitH = 0;

	function measure() {
		const c = containers.find((x) => x);
		if (c) digitH = c.offsetHeight;
	}

	function spin() {
		if (motionReduced()) return;
		measure();
		const h = digitH || 1;
		chars.forEach((char, i) => {
			if (!char.spin) return;
			const reel = reels[i];
			if (!reel) return;
			const entry = strips[i];
			if (!entry) return;
			const finalOffset = -entry.stopIndex * h;
			gsap.killTweensOf(reel);
			gsap.fromTo(
				reel,
				{ y: 0 },
				{
					y: finalOffset,
					duration: duration + i * stagger,
					ease: EASES.outBack,
					delay: spinDelay + i * 0.02
				}
			);
		});
	}

	// Re-run whenever value changes (and on initial mount, after refs are bound).
	$effect(() => {
		value;
		chars;
		const id = requestAnimationFrame(() => {
			measure();
			spin();
		});
		return () => cancelAnimationFrame(id);
	});

	// Kill active spins immediately when reduce-motion is toggled on mid-animation.
	$effect(() => {
		motionReduced();
		gsap.killTweensOf(reels.filter(Boolean) as HTMLElement[]);
	});

	onDestroy(() => {
		gsap.killTweensOf(reels.filter(Boolean) as HTMLElement[]);
	});
</script>

<div class={`slot-number ${klass}`} aria-label={String(value)}>
	{#each chars as char, i (i)}
		{#if char.spin}
			<span class="col" bind:this={containers[i]} aria-hidden="true">
				<span class="reel" bind:this={reels[i]}>
					{#if motionReduced()}
						<span class="digit">{char.ch}</span>
					{:else}
						{#each strips[i]?.strip ?? [] as d, di (`${i}-${di}`)}
							<span class="digit">{d}</span>
						{/each}
					{/if}
				</span>
			</span>
		{:else}
			<span class="static" aria-hidden="true">{char.ch}</span>
		{/if}
	{/each}
</div>

<style>
	.slot-number {
		display: inline-flex;
		align-items: center;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.01em;
		white-space: nowrap;
	}
	.col {
		display: inline-block;
		overflow: hidden;
		height: 1em;
		line-height: 1;
		vertical-align: top;
	}
	.reel {
		display: flex;
		flex-direction: column;
		line-height: 1;
		will-change: transform;
	}
	.digit {
		display: block;
		height: 1em;
		line-height: 1;
		text-align: center;
	}
	.static {
		display: inline-block;
		line-height: 1;
	}
</style>
