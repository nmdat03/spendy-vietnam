<script lang="ts">
	// CategoryChip: selectable pill chip (icon + name) for the category grid.
	// Selected = soft violet fill + violet border + violet text; default =
	// muted fill + transparent border + muted text.
	import { gsap, EASES } from '$lib/animations/gsap';
	import { motionReduced } from '$lib/state/settings.svelte';
	import Icon from './Icon.svelte';
	import type { Category } from '$lib/db/schema';

	interface Props {
		category: Category;
		selected: boolean;
		onselect: (c: Category) => void;
	}
	let { category, selected, onselect }: Props = $props();

	let el = $state<HTMLButtonElement | null>(null);

	// Entrance stagger is handled by the parent; here we just animate selection.
	$effect(() => {
		selected;
		if (!el) return;
		if (selected && !motionReduced()) {
			gsap.fromTo(el, { scale: 0.96 }, { scale: 1, duration: 0.35, ease: EASES.outBack });
		}
	});

	function select() {
		onselect(category);
	}
</script>

<button bind:this={el} class="chip touch" class:selected onclick={select} aria-pressed={selected}>
	<span class="ic" style:color={selected ? 'var(--violet)' : category.color}>
		<Icon name={category.icon} size={15} />
	</span>
	<span class="name">{category.name}</span>
</button>

<style>
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 10px 15px 10px 12px;
		border-radius: 999px;
		background: var(--muted);
		border: 1.5px solid transparent;
		color: var(--muted-foreground);
		font-size: 13px;
		font-weight: 600;
		letter-spacing: -0.01em;
		white-space: nowrap;
		-webkit-tap-highlight-color: transparent;
		transition:
			background 0.18s ease,
			border-color 0.18s ease,
			color 0.18s ease;
	}
	.chip.selected {
		background: color-mix(in srgb, var(--violet) 13%, var(--card));
		border-color: var(--violet);
		color: var(--violet);
	}
	.ic {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.name {
		line-height: 1;
	}
</style>
