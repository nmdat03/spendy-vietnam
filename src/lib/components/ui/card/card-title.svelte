<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<h3 class={cn('text-[16px] leading-tight font-bold tracking-tight', className)}>
	{@render children?.()}
</h3>
