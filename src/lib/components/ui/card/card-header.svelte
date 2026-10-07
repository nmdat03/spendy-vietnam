<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<div class={cn('flex flex-col gap-1.5 p-5 pb-3', className)}>
	{@render children?.()}
</div>
