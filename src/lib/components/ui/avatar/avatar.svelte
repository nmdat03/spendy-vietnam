<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		name?: string;
		src?: string;
		size?: number;
		class?: string;
	}

	let { name = '', src, size = 44, class: className = '' }: Props = $props();

	const initials = $derived(
		name
			.trim()
			.split(/\s+/)
			.map((w) => w[0])
			.slice(0, 2)
			.join('')
			.toUpperCase() || 'S'
	);
</script>

<span
	class={cn(
		'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold tracking-tight select-none',
		className
	)}
	style="width:{size}px;height:{size}px;font-size:{Math.round(
		size * 0.38
	)}px;background:linear-gradient(140deg, color-mix(in oklab, var(--violet) 22%, var(--card)), color-mix(in oklab, var(--blue) 16%, var(--card)));color:var(--foreground)"
	aria-hidden="true"
>
	{#if src}
		<img {src} alt={name} class="size-full object-cover" />
	{:else}
		{initials}
	{/if}
</span>
