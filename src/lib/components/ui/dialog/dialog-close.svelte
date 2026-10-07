<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		children?: import('svelte').Snippet;
		'aria-label'?: string;
	}

	let { class: className = '', children, 'aria-label': ariaLabel = undefined }: Props = $props();
</script>

<DialogPrimitive.Close class={cn('cursor-pointer', className)} aria-label={ariaLabel}>
	{@render children?.()}
</DialogPrimitive.Close>
