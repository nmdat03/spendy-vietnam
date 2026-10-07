<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<DialogPrimitive.Description
	class={cn('text-[13.5px] leading-relaxed text-muted-foreground', className)}
>
	{@render children?.()}
</DialogPrimitive.Description>
