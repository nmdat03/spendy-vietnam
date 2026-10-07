<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';

	interface Props {
		open?: boolean;
		children?: import('svelte').Snippet;
	}

	let { open = $bindable(false), children }: Props = $props();
</script>

<DialogPrimitive.Root bind:open>
	{@render children?.()}
</DialogPrimitive.Root>
