<script lang="ts">
	// CategoryChip: single selectable category tile (icon + name) used in Step 2 grid.
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

<button
	bind:this={el}
	class="chip"
	class:selected
	onclick={select}
	style="--cat: {category.color}"
	aria-pressed={selected}
>
	<span class="icon-wrap">
		<Icon name={category.icon} size={22} color={category.color} />
		{#if selected}
			<span class="check" aria-hidden="true">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="#fff"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg
				>
			</span>
		{/if}
	</span>
	<span class="name">{category.name}</span>
</button>

<style>
	.chip {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 14px 6px;
		border-radius: var(--r-md);
		background: var(--surface-2);
		border: 2px solid transparent;
		transition:
			border-color 0.2s ease,
			background 0.2s ease;
	}
	.chip.selected {
		border-color: var(--cat);
		background: color-mix(in srgb, var(--cat) 12%, var(--surface));
	}
	.icon-wrap {
		position: relative;
		width: 46px;
		height: 46px;
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--cat) 16%, var(--surface));
	}
	.check {
		position: absolute;
		right: -4px;
		top: -4px;
		width: 20px;
		height: 20px;
		border-radius: 999px;
		background: var(--cat);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: var(--shadow-sm);
	}
	.name {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--text);
		text-align: center;
	}
</style>
